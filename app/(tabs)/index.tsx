import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { AppText } from '../../src/components/AppText';
import { BrandMark } from '../../src/components/BrandMark';
import { Button, ButtonRow } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { CueControls, MODE_LABEL } from '../../src/components/CueControls';
import { RhythmCard } from '../../src/components/RhythmCard';
import { Screen } from '../../src/components/Screen';
import { SessionDots } from '../../src/components/SessionDots';
import { Sheet } from '../../src/components/Sheet';
import { practiceHref } from '../../src/practice/launch';
import { subtitleOf, techniqueOf } from '../../src/practice/practice';
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
import { colors, radius, spacing, touchTarget } from '../../src/theme';

const PLAN_LABEL = { morning: 'Your morning practice', midday: 'Your midday practice', evening: 'Your evening practice' } as const;

/**
 * Breathe (FR-01): the ready practice and one action to begin it. While a
 * program is active (FR-20) its next session is the ready practice; after
 * 7 days or more away, it offers to continue or repeat.
 */
export default function Breathe() {
  const { preferences, update } = usePreferences();
  const [cuesOpen, setCuesOpen] = useState(false);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  useFocusEffect(useCallback(() => setEnrollment(stores().programs.active()), []));

  const saveEnrollment = (e: Enrollment) => {
    stores().programs.save(e);
    setEnrollment(e);
  };

  const session = enrollment ? nextSessionNumber(enrollment) : null;
  const run = enrollment && session ? sessionRun(enrollment.definition, session) : null;
  const practice = run ? run.parts[0] : readyPractice(preferences, stores());
  const technique = techniqueOf(practice);
  const guidance = [MODE_LABEL[preferences.cueMode], preferences.haptics ? 'Haptics' : null].filter(Boolean).join(' · ');
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
        <AppText variant="label">{eyebrow}</AppText>
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

  return (
    <Screen footer={<Button title={run && session ? `Begin session ${session}` : 'Begin'} onPress={begin} accessibilityHint={`Starts ${run?.name ?? practice.name}`} />}>
      {header}
      <AppText variant="hero" accessibilityRole="header">
        A little space{'\n'}to breathe.
      </AppText>
      {enrollment && run && session ? (
        <Card muted>
          <AppText variant="bodyStrong">{enrollment.definition.name}</AppText>
          <AppText variant="label">
            Session {session} of {totalSessions(enrollment)}
            {run.parts.length > 1 ? ` · ${sessionTitle(enrollment.definition.sessions[session - 1])}` : ''}
          </AppText>
          <SessionDots
            total={totalSessions(enrollment)}
            done={enrollment.completedSessions}
            label={`${enrollment.completedSessions} of ${totalSessions(enrollment)} sessions complete. Session ${session} is next.`}
          />
        </Card>
      ) : null}
      <RhythmCard
        name={practice.name}
        subtitle={subtitleOf(practice)}
        steps={practice.steps}
        target={practice.target}
        slowing={practice.slowing}
        nameHint={technique?.pronunciation?.respelling}
      />
      {run && run.parts.length > 1 ? <AppText variant="label">Then {run.parts.slice(1).map((p) => p.name).join(', then ')}.</AppText> : null}
      <ButtonRow>
        {enrollment ? (
          <Button
            title="View program"
            variant="secondary"
            style={styles.flex}
            onPress={() => router.push({ pathname: '/program/[id]', params: { id: enrollment.programId } })}
          />
        ) : null}
        <Button title="Change practice" variant="secondary" style={styles.flex} onPress={() => router.navigate('/practices')} />
        {enrollment ? null : <Button title="Adjust" variant="secondary" style={styles.flex} onPress={() => router.push('/adjust')} />}
      </ButtonRow>
      <Pressable
        onPress={() => setCuesOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`Guidance: ${guidance}`}
        accessibilityHint="Change voice, tones, haptics, and motion"
        style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
      >
        <AppText variant="control" style={styles.chipText}>
          Guidance: {guidance}
        </AppText>
        <AppText variant="control" style={styles.chipText} importantForAccessibility="no">
          ›
        </AppText>
      </Pressable>
      <Sheet visible={cuesOpen} title="Guidance" onClose={() => setCuesOpen(false)}>
        <CueControls />
      </Sheet>
    </Screen>
  );
}

function Choice({ title, detail, onPress }: { title: string; detail: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${detail}`}
      style={({ pressed }) => [styles.choice, pressed && styles.chipPressed]}
    >
      <AppText variant="bodyStrong">{title}</AppText>
      <AppText variant="label">{detail}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  brand: { flexDirection: 'row', alignItems: 'center', gap: spacing.ms },
  wordmark: { color: colors.pine },
  muted: { color: colors.inkSoft },
  flex: { flexGrow: 1, flexBasis: 140 },
  chip: {
    minHeight: touchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
  },
  chipPressed: { opacity: 0.8 },
  chipText: { color: colors.pine, flexShrink: 1 },
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
