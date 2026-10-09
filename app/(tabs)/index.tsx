import { useCallback, useRef, useState } from 'react';
import { refreshWatch } from '../../src/companion/CompanionBridge';
import { cautionFor } from '../../src/practice/caution';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { AppText } from '../../src/components/AppText';
import { BrandMark } from '../../src/components/BrandMark';
import { formatClock, rhythmLine, slowingLine } from '../../src/breathing/describe';
import { planFor } from '../../src/breathing/rhythm';
import { Button } from '../../src/components/Button';
import { Chevron } from '../../src/components/Chevron';
import { CueControls } from '../../src/components/CueControls';
import { DurationSheet } from '../../src/components/DurationSheet';
import { RhythmOrb } from '../../src/components/RhythmOrb';
import { Screen } from '../../src/components/Screen';
import { Sheet } from '../../src/components/Sheet';
import { Frosted, useGlass, useWash } from '../../src/light/light';
import { Halo } from '../../src/light/Wash';
import { HALO } from '../../src/light/washes';
import { durationRow } from '../../src/practice/durationOptions';
import { guidanceLine } from '../../src/practice/guidanceRules';
import { practiceHref } from '../../src/practice/launch';
import { subtitleOf, techniqueOf, type Practice } from '../../src/practice/practice';
import { readyPractice } from '../../src/practice/ready';
import {
  acknowledge,
  nextSessionNumber,
  repeatPrevious,
  sessionLine,
  sessionRun,
  sessionTitle,
  totalSessions,
  welcomeBack,
  type Enrollment,
} from '../../src/programs/engine';
import { reminderTime } from '../../src/reminder/reminder';
import { usePreferences } from '../../src/settings/PreferencesProvider';
import { stores } from '../../src/storage';
import { colors, fonts, radius, shadows, spacing, touchTarget } from '../../src/theme';

const PLAN_LABEL = { morning: 'Your morning practice', midday: 'Your midday practice', evening: 'Your evening practice' } as const;

/**
 * Breathe (FR-01): the ready practice and one action to begin it. While a
 * program is active (FR-20) its next session is the ready practice; after
 * 7 days or more away, it offers to continue or repeat.
 */
export default function Breathe() {
  const { preferences, update } = usePreferences();
  const [cuesOpen, setCuesOpen] = useState(false);
  const [durationOpen, setDurationOpen] = useState(false);
  const glass = useGlass();
  const wash = useWash() ?? 'day';
  const { fontScale } = useWindowDimensions();
  // Smaller at large text sizes, so the words keep their room.
  const orb = fontScale > 1.3 ? { size: 104, halo: 170 } : { size: 136, halo: 222 };
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  // Back from the Visual guide chooser, Guidance opens again where it was.
  const reopenGuidance = useRef(false);
  useFocusEffect(
    useCallback(() => {
      setEnrollment(stores().programs.active());
      if (reopenGuidance.current) {
        reopenGuidance.current = false;
        setCuesOpen(true);
      }
    }, []),
  );

  const saveEnrollment = (e: Enrollment) => {
    stores().programs.save(e);
    refreshWatch();
    setEnrollment(e);
  };

  const session = enrollment ? nextSessionNumber(enrollment) : null;
  const run = enrollment && session ? sessionRun(enrollment.definition, session) : null;
  const practice = run ? run.parts[0] : readyPractice(preferences, stores());
  const technique = techniqueOf(practice);
  const away = enrollment ? welcomeBack(enrollment, Date.now()) : null;
  const plan = enrollment?.plan;
  const eyebrow = !plan ? 'Ready when you are' : plan.time === 'custom' ? `Your practice at ${reminderTime(plan)}` : PLAN_LABEL[plan.time];

  const begin = () => {
    if (run) return router.push(practiceHref(run));
    update({ lastPractice: practice });
    router.push(practiceHref(practice));
  };

  const header = (
    <View style={styles.brand}>
      <BrandMark size={32} />
      <View>
        <AppText variant="bodyStrong" style={styles.wordmark}>
          Viram
        </AppText>
        <AppText variant="label" style={styles.eyebrow}>
          {eyebrow}
        </AppText>
      </View>
    </View>
  );

  if (enrollment && away) {
    const program = enrollment.definition;
    const choose = (e: Enrollment) => saveEnrollment(acknowledge(e, Date.now()));
    return (
      <Screen>
        {header}
        <AppText variant="hero" accessibilityRole="header">
          Welcome back.
        </AppText>
        <AppText style={styles.muted}>
          It’s been a little while since session {away.repeat} of {program.name}. Pick up wherever suits you; nothing was lost.
        </AppText>
        <Choice
          title={`Continue with session ${away.next}`}
          detail={sessionLine(program.sessions[away.next - 1])}
          onPress={() => choose(enrollment)}
        />
        <Choice
          title={`Repeat session ${away.repeat}`}
          detail={`${sessionTitle(program.sessions[away.repeat - 1])}, to settle back in`}
          onPress={() => choose(repeatPrevious(enrollment, Date.now()))}
        />
        <Button
          title="Choose another practice"
          variant="quiet"
          onPress={() => {
            choose(enrollment);
            router.navigate('/practices');
          }}
        />
      </Screen>
    );
  }

  const total = run ? programLength(run.parts) : null;
  const duration = durationRow(practice);
  const opensGuide = !!run || practice.source.kind === 'technique';
  const subtitle = subtitleOf(practice);
  const nameLabel = `${practice.name}${subtitle ? `, ${subtitle.charAt(0).toLowerCase()}${subtitle.slice(1)}` : ''}. ${opensGuide ? 'Opens the guide.' : 'Opens Adjust rhythm.'}`;
  const openName = () => {
    if (opensGuide && practice.techniqueId) router.push({ pathname: '/technique/[id]', params: { id: practice.techniqueId } });
    else router.push('/adjust');
  };

  return (
    <Screen footer={<Button title={run && session ? `Begin session ${session}` : 'Begin'} onPress={begin} accessibilityHint={`Starts ${run?.name ?? practice.name}`} />}>
      {header}
      <AppText variant="hero" accessibilityRole="header">
        A little space{'\n'}to breathe.
      </AppText>
      {enrollment && run && session ? (
        <Pressable
          onPress={() => router.push({ pathname: '/program/[id]', params: { id: enrollment.programId } })}
          accessibilityRole="button"
          accessibilityLabel={`${enrollment.definition.name}, session ${session} of ${totalSessions(enrollment)}. View the program.`}
          style={({ pressed }) => [styles.programLine, { backgroundColor: glass.fill, borderColor: glass.rim }, pressed && styles.pressed]}
        >
          <Frosted>
            <View style={styles.flex}>
              <AppText style={styles.programName}>{enrollment.definition.name}</AppText>
              <AppText variant="label">
                Session {session} of {totalSessions(enrollment)}
              </AppText>
            </View>
          </Frosted>
          <AppText style={styles.view}>View</AppText>
          <Chevron />
        </Pressable>
      ) : null}
      <View style={[styles.stage, { height: orb.size }]}>
        <Halo stops={HALO[wash]} size={orb.halo} style={[styles.halo, { marginLeft: -orb.halo / 2, marginTop: -orb.halo / 2 }]} />
        <RhythmOrb steps={practice.steps} size={orb.size} />
      </View>
      <Pressable
        onPress={openName}
        accessibilityRole="link"
        accessibilityLabel={nameLabel}
        accessibilityHint={technique?.pronunciation?.respelling}
        style={({ pressed }) => [styles.nameLink, pressed && styles.pressed]}
      >
        <View style={styles.nameRow}>
          <AppText style={styles.name}>{practice.name}</AppText>
          <Chevron />
        </View>
        {subtitle ? <AppText style={styles.subtitle}>{subtitle}</AppText> : null}
        <AppText style={styles.rhythm}>{rhythmLine(practice.steps)}</AppText>
        {practice.slowing ? <AppText style={styles.subtitle}>{slowingLine(practice.steps, practice.slowing)}</AppText> : null}
      </Pressable>
      {run && run.parts.length > 1 ? (
        <AppText variant="label" style={styles.center}>
          Then {run.parts.slice(1).map((p) => p.name).join(', then ')}.
        </AppText>
      ) : null}
      {/* The ready practice's short caution, before Begin (content review F10). */}
      <AppText variant="label" style={styles.center}>
        {cautionFor(practice)}
      </AppText>
      <View style={[styles.group, { backgroundColor: glass.fill, borderColor: glass.rim }]}>
        <Frosted>
          {total ? (
            <View style={[styles.row, styles.divider]} accessible accessibilityLabel={`Duration, ${total}. Set by the program.`}>
              <View style={styles.flex}>
                <AppText variant="bodyStrong">Duration</AppText>
                <AppText variant="label">Set by the program</AppText>
              </View>
              <AppText variant="bodyStrong">{total}</AppText>
            </View>
          ) : (
            <GroupRow
              title="Duration"
              detail={duration.detail}
              value={duration.value}
              hint="Choose how long to practise"
              onPress={() => setDurationOpen(true)}
              divider
            />
          )}
          <GroupRow
            title="Guidance"
            detail={guidanceLine(preferences.cueMode, preferences.haptics)}
            hint="Change voice, tones, haptics, visual guide, and motion"
            onPress={() => setCuesOpen(true)}
          />
        </Frosted>
      </View>
      <Sheet visible={cuesOpen} title="Guidance" onClose={() => setCuesOpen(false)}>
        <CueControls
          onVisualGuide={() => {
            reopenGuidance.current = true;
            setCuesOpen(false);
            router.push({ pathname: '/visual-guide', params: { origin: 'guidance', practice: JSON.stringify({ name: practice.name, steps: practice.steps }) } });
          }}
        />
      </Sheet>
      {run ? null : (
        <DurationSheet
          visible={durationOpen}
          practice={practice}
          onClose={() => setDurationOpen(false)}
          onChoose={(target) => {
            update({ lastPractice: { ...practice, target } });
            setDurationOpen(false);
          }}
          onAdjust={() => {
            setDurationOpen(false);
            router.push('/adjust');
          }}
        />
      )}
    </Screen>
  );
}

/** One row of Breathe's settings card: a label, a detail line, and what it opens. */
function GroupRow({ title, detail, value, hint, onPress, divider }: { title: string; detail: string | null; value?: string; hint: string; onPress: () => void; divider?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[title, value, detail].filter(Boolean).join(', ')}
      accessibilityHint={hint}
      style={({ pressed }) => [styles.row, divider && styles.divider, pressed && styles.pressed]}
    >
      <View style={styles.flex}>
        <AppText variant="bodyStrong">{title}</AppText>
        {detail ? <AppText variant="label">{detail}</AppText> : null}
      </View>
      {value ? <AppText variant="bodyStrong" style={styles.value}>{value}</AppText> : null}
      <Chevron color={colors.inkFaint} />
    </Pressable>
  );
}

/** A program session's length: “8 min” when every part is in minutes, otherwise its planned time. */
function programLength(parts: readonly Practice[]): string {
  if (parts.every((p) => 'minutes' in p.target)) return `${parts.reduce((sum, p) => sum + ('minutes' in p.target ? p.target.minutes : 0), 0)} min`;
  return formatClock(parts.reduce((sum, p) => sum + planFor(p.steps, p.target, p.slowing ?? null).durationMs, 0));
}

function Choice({ title, detail, onPress }: { title: string; detail: string; onPress: () => void }) {
  const glass = useGlass();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${detail}`}
      style={({ pressed }) => [styles.choice, { backgroundColor: glass.fill, borderColor: glass.outline }, pressed && styles.chipPressed]}
    >
      <AppText variant="bodyStrong">{title}</AppText>
      <AppText variant="label">{detail}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  brand: { flexDirection: 'row', alignItems: 'center', gap: spacing.ms },
  wordmark: { color: colors.pine },
  eyebrow: { fontSize: 14, lineHeight: 18 },
  muted: { color: colors.inkSoft },
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  pressed: { opacity: 0.8 },
  programLine: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.ms,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    borderRadius: 18,
    borderWidth: 1,
  },
  programName: { fontFamily: fonts.sansSemibold, fontSize: 15, lineHeight: 20 },
  view: { fontFamily: fonts.sansSemibold, fontSize: 15, color: colors.pine },
  stage: { alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' },
  halo: { position: 'absolute', left: '50%', top: '50%' },
  // 12 below the orb, as on the board (the screen's gap is 16).
  nameLink: { alignSelf: 'center', alignItems: 'center', gap: 2, minHeight: touchTarget, marginTop: -4 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontFamily: fonts.sansSemibold, fontSize: 22, lineHeight: 28 },
  subtitle: { fontSize: 15, lineHeight: 20, color: colors.inkSoftOnWash, textAlign: 'center' },
  rhythm: { marginTop: spacing.xs, fontSize: 15, lineHeight: 20, textAlign: 'center' },
  group: { borderRadius: radius.card, borderWidth: 1, boxShadow: shadows.card, overflow: 'hidden' },
  row: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: spacing.ms, paddingVertical: spacing.ms, paddingHorizontal: spacing.md },
  divider: { borderBottomWidth: 1, borderBottomColor: 'rgba(18, 55, 47, 0.08)' },
  value: { color: colors.pine },
  chipPressed: { opacity: 0.8 },
  choice: {
    minHeight: touchTarget,
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: radius.card,
    padding: spacing.md,
    gap: 2,
    backgroundColor: colors.surface,
  },
});
