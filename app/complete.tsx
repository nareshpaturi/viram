import { useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { describeRhythm, describeTarget, rhythmLine } from '../src/breathing/describe';
import { AppText } from '../src/components/AppText';
import { Button } from '../src/components/Button';
import { Card } from '../src/components/Card';
import { ConfirmPanel } from '../src/components/ConfirmPanel';
import { Screen } from '../src/components/Screen';
import { timeWithBreath } from '../src/history/format';
import { parseRecord, type SessionRecord } from '../src/history/repository';
import type { Practice } from '../src/practice/practice';
import { easierPractice, OFFER_WINDOW_MS, progressionOffer, type Offer } from '../src/progression/progression';
import { findProgram } from '../src/programs/definitions';
import { phaseEndingAt, recordSession, repeatPhase, sessionRun, type Enrollment } from '../src/programs/engine';
import { healthEligible, writeToHealth } from '../src/health/health';
import { offerTime, shouldOfferReminder } from '../src/reminder/offer';
import { askForReminderPermission, reminderTime } from '../src/reminder/reminder';
import { refreshReminder } from '../src/reminder/ReminderBridge';
import { refreshQuickActions } from '../src/quickstart/QuickActionsBridge';
import { refreshWidget } from '../src/widget/WidgetBridge';
import { LightProvider, useEverydayWash, useGlass, useWash } from '../src/light/light';
import { Halo, Wash } from '../src/light/Wash';
import { BLOOM, WASHES } from '../src/light/washes';
import { NIGHT, SurfaceProvider, useSurface } from '../src/night/surface';
import Svg, { Path } from 'react-native-svg';
import { usePreferences } from '../src/settings/PreferencesProvider';
import { stores } from '../src/storage';
import { colors, fonts, spacing, touchTarget } from '../src/theme';

type SaveState = 'saving' | 'saved' | 'failed' | 'leaving';
/** What the practitioner chose for next time, if anything (FR-15). */
type NextTime = { kind: 'next' | 'easier'; practice: Practice } | { kind: 'notNow' | 'stopped' } | null;
/** The one-time reminder offer and its answer (FR-17). */
type ReminderOffer = { hour: number; minute: number; answer: 'on' | 'denied' | 'declined' | null };
/** A program session's effect on its program (FR-20). */
type ProgramResult =
  | { kind: 'session'; enrollment: Enrollment; repeating?: number }
  | { kind: 'phase'; enrollment: Enrollment; phase: NonNullable<ReturnType<typeof phaseEndingAt>> }
  | { kind: 'complete'; enrollment: Enrollment };

/** Counts a saved program session once, and says what it means for the program. */
function applyToProgram(record: SessionRecord): ProgramResult | null {
  if (!record.program) return null;
  const programs = stores().programs;
  const before = programs.forProgram(record.program.id);
  if (!before) return null;
  const enrollment = recordSession(before, record, Date.now());
  const counted = enrollment !== before;
  if (counted) programs.save(enrollment);
  if (counted && enrollment.state === 'completed') return { kind: 'complete', enrollment };
  const phase = counted ? phaseEndingAt(enrollment.definition, record.program.session) : null;
  return phase ? { kind: 'phase', enrollment, phase } : { kind: 'session', enrollment };
}

function save(record: SessionRecord): SaveState {
  try {
    stores().history.save(record);
    return 'saved';
  } catch {
    return 'failed';
  }
}

/**
 * Completion (UX03): the check, a hero, how long you breathed, and “Saved on
 * this device” only after the write succeeds; a failed save keeps the result
 * for retry. At most one compact offer, and one filled button, Done. The
 * numbers, rhythm, program progress, and Health status are in View practice.
 * Nothing else interrupts this screen, and there is never a rating prompt.
 */
export default function Complete() {
  const { night } = useLocalSearchParams<{ night?: string }>();
  const wash = useEverydayWash();
  // Night practice finishes on the same surface it ran on (FR-23); otherwise
  // the hour's Soft Light, with warmth rising from below.
  return (
    <SurfaceProvider setting="off" night={night === '1'}>
      <LightProvider wash={night === '1' ? null : wash}>
        {night === '1' ? <StatusBar style="light" /> : null}
        <CompleteScreen />
      </LightProvider>
    </SurfaceProvider>
  );
}

function CompleteScreen() {
  const params = useLocalSearchParams<{ record?: string }>();
  const wash = useWash() ?? 'day';
  const surface = useSurface();
  const record = useMemo(() => {
    try {
      return params.record ? parseRecord(JSON.parse(params.record)) : null;
    } catch {
      return null;
    }
  }, [params.record]);
  const { preferences, update } = usePreferences();
  const [state, setState] = useState<SaveState>('saving');
  const [offer, setOffer] = useState<Offer | null>(null);
  const [nextTime, setNextTime] = useState<NextTime>(null);
  const [programResult, setProgramResult] = useState<ProgramResult | null>(null);
  const [phaseAnswer, setPhaseAnswer] = useState<string | null>(null);
  const [reminderOffer, setReminderOffer] = useState<ReminderOffer | null>(null);
  const easier = useMemo(() => (record ? easierPractice(record) : null), [record]);
  // The saved check grows with its label, up to 200%.
  const checkSize = 14 * Math.min(useWindowDimensions().fontScale, 2);

  useEffect(() => {
    if (!record) return;
    const result = save(record);
    setState(result);
    if (result === 'saved') {
      refreshQuickActions(preferences);
      refreshWidget(preferences);
      // Health writing follows the local save, never replaces it (FR-18).
      // Its result shows in the practice's details.
      if (preferences.healthConnected && healthEligible(record)) writeToHealth(stores(), record).catch(() => undefined);
      let program: ProgramResult | null = null;
      try {
        program = applyToProgram(record);
        setProgramResult(program);
        refreshReminder(preferences);
      } catch {
        // The practice is saved; the program catches up next time it's opened.
      }
      // Worked out once, so answering it doesn't make it disappear mid-sentence.
      // One offer at most: a phase decision, then progression, then the next
      // program, then the reminder, which is offered once, when nothing else is.
      const now = Date.now();
      try {
        const progression =
          program?.kind === 'phase' ? null : progressionOffer(record, stores().history.between(now - OFFER_WINDOW_MS, now + 1), preferences, now);
        setOffer(progression);
        const nextProgram = program?.kind === 'complete' && program.enrollment.definition.next;
        if (program?.kind !== 'phase' && !progression && !nextProgram && shouldOfferReminder(record, stores().history.count(), preferences)) {
          setReminderOffer({ ...offerTime(record.startedAt), answer: null });
          update({ reminderOffered: true });
        }
      } catch {
        // No offer is better than an interrupted completion screen.
      }
    }
    AccessibilityInfo.announceForAccessibility(result === 'saved' ? 'Practice complete. Saved on this device.' : 'Practice finished. It could not be saved yet.');
    // Save once per record.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record]);

  if (!record) return <Redirect href="/" />;

  const completed = record.outcome === 'completed';
  const done = () => router.replace('/');

  if (state === 'leaving') {
    return (
      <Screen edges={['top', 'left', 'right', 'bottom']}>
        <ConfirmPanel
          title="Leave without saving?"
          body="This practice will not appear in History. You can return and try saving again."
          cancelLabel="Keep this practice"
          confirmLabel="Leave without saving"
          destructive
          onCancel={() => setState('failed')}
          onConfirm={done}
        />
      </Screen>
    );
  }

  const chooseNext = (choice: NonNullable<NextTime>) => {
    const snooze = offer ? { progressionSnoozed: { ...preferences.progressionSnoozed, [offer.techniqueId]: Date.now() } } : {};
    if (choice.kind === 'next') update({ lastPractice: choice.practice, ...snooze });
    if (choice.kind === 'easier') update({ lastPractice: choice.practice });
    if (choice.kind === 'notNow') update(snooze);
    if (choice.kind === 'stopped' && offer) update({ progressionStopped: [...preferences.progressionStopped, offer.techniqueId] });
    setNextTime(choice);
    AccessibilityInfo.announceForAccessibility(nextTimeMessage(choice, offer) ?? 'Not now');
  };

  const acceptReminder = async (time: ReminderOffer) => {
    const granted = await askForReminderPermission().catch(() => false);
    if (granted) update({ reminder: { enabled: true, hour: time.hour, minute: time.minute } });
    setReminderOffer({ ...time, answer: granted ? 'on' : 'denied' });
    AccessibilityInfo.announceForAccessibility(granted ? `Daily reminder on at ${reminderTime(time)}` : 'Notifications are off for Viram');
  };

  const answerPhase = (result: Extract<ProgramResult, { kind: 'phase' }>, repeat: boolean) => {
    const next = result.phase.number + 1;
    if (repeat) {
      const repeated = repeatPhase(result.enrollment, result.phase.done, Date.now());
      stores().programs.save(repeated);
      setProgramResult({ kind: 'session', enrollment: repeated, repeating: result.phase.number });
    } else {
      setProgramResult({ kind: 'session', enrollment: result.enrollment });
    }
    const line = repeat ? `Phase ${result.phase.number} again, from session ${result.phase.done.first}. There’s no rush.` : `Phase ${next} is next.`;
    setPhaseAnswer(line);
    AccessibilityInfo.announceForAccessibility(line);
  };

  const failed = state === 'failed';
  const saved = state === 'saved';
  const hero =
    saved && programResult?.kind === 'complete'
      ? `${programResult.enrollment.definition.shortName},\ncomplete.`
      : saved && programResult?.kind === 'phase'
        ? `Phase ${programResult.phase.number},\ncomplete.`
        : null;
  const nextProgram = programResult?.kind === 'complete' && programResult.enrollment.definition.next ? findProgram(programResult.enrollment.definition.next) : undefined;
  // Answers collapse their card to one line.
  const confirmations = [
    phaseAnswer,
    nextTimeMessage(nextTime, offer),
    reminderOffer?.answer ? REMINDER_ANSWER[reminderOffer.answer](reminderOffer) : null,
  ].filter((line): line is string => !!line);
  return (
    <Screen
      edges={['top', 'left', 'right']}
      background={surface.night ? undefined : <Wash wash={WASHES[wash]} extra={[BLOOM]} />}
      footer={
        failed ? (
          <>
            <Button title="Try saving again" onPress={() => setState(save(record))} />
            <Button title="Leave without saving" variant="secondary" onPress={() => setState('leaving')} />
          </>
        ) : (
          <>
            {saved ? (
              <View style={styles.links}>
                <Button
                  title="View practice"
                  variant="quiet"
                  style={styles.link}
                  onPress={() => router.push({ pathname: '/session/[id]', params: { id: record.id, from: 'complete' } })}
                />
                {easier && !nextTime ? (
                  <>
                    <AppText variant="control" style={styles.dot} importantForAccessibility="no" accessibilityElementsHidden>
                      ·
                    </AppText>
                    <Button title="Make it easier next time" variant="quiet" style={styles.link} onPress={() => chooseNext({ kind: 'easier', practice: easier })} />
                  </>
                ) : null}
              </View>
            ) : null}
            <Button title="Done" onPress={done} />
          </>
        )
      }
    >
      <CheckMark night={surface.night} />
      <AppText variant="hero" accessibilityRole="header" style={styles.hero}>
        {failed ? 'Your practice finished.' : (hero ?? (completed ? 'A little space,\nmade.' : 'A pause still counts.'))}
      </AppText>
      <AppText style={styles.line}>
        {failed ? 'We couldn’t save it to History yet.' : completed ? timeWithBreath(record.activeMs) : 'Your practice is saved as ended early.'}
      </AppText>
      {failed ? (
        <AppText variant="label" style={styles.warning}>
          Try saving again before leaving this screen.
        </AppText>
      ) : saved ? (
        <View style={styles.saved} accessible accessibilityLabel="Saved on this device">
          <Svg width={checkSize} height={checkSize} viewBox="0 0 24 24" fill="none" stroke={surface.night ? NIGHT.accent : colors.pine} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M5 12.5l4.5 4.5L19 7.5" />
          </Svg>
          <AppText variant="label" style={styles.savedText}>
            Saved on this device
          </AppText>
        </View>
      ) : null}
      {saved && programResult?.kind === 'phase' ? (
        <OfferCard
          title={`${programResult.enrollment.definition.name.toUpperCase()} · PHASE ${programResult.phase.number + 1}`}
          body={`${programResult.phase.next.intro} If the longer exhale feels like a strain, repeat this phase.`}
          detail={phaseDetail(programResult)}
          yes={{ title: `Move on to phase ${programResult.phase.number + 1}`, onPress: () => answerPhase(programResult, false) }}
          no={{ title: 'Repeat this phase', onPress: () => answerPhase(programResult, true) }}
        />
      ) : saved && offer && !nextTime ? (
        <OfferCard
          title="NEXT TIME, IF YOU LIKE"
          // Completing isn't the same as finding it easy (content review I5).
          body={`You’ve completed ${offer.current.name} at ${describeRhythm(offer.current.steps)} ${timesWord(offer.count)} in the last two weeks. ${offer.prompt} Only if it feels easy: no strain, no dizziness, no gasping for the next breath.`}
          detail={`${rhythmLine(offer.next.steps)} · ${describeTarget(offer.next.target)}`}
          yes={{ title: 'Try next time', onPress: () => chooseNext({ kind: 'next', practice: offer.next }) }}
          no={{ title: 'Not now', onPress: () => chooseNext({ kind: 'notNow' }) }}
          more={{ title: 'Stop suggesting for this practice', onPress: () => chooseNext({ kind: 'stopped' }) }}
        />
      ) : saved && nextProgram ? (
        <OfferCard
          title="A NEXT STEP, IF YOU LIKE"
          body={`${nextProgram.name}. ${nextProgram.summary}`}
          detail={nextProgram.eyebrow}
          yes={{ title: 'Preview program', onPress: () => router.replace({ pathname: '/program/[id]', params: { id: nextProgram.id } }) }}
        />
      ) : saved && reminderOffer && !reminderOffer.answer ? (
        <OfferCard
          title="A DAILY REMINDER?"
          body="Practicing at about the same time each day makes it easier to come back."
          yes={{ title: `Remind me at ${reminderTime(reminderOffer)}`, onPress: () => acceptReminder(reminderOffer) }}
          no={{ title: 'No thanks', onPress: () => setReminderOffer({ ...reminderOffer, answer: 'declined' }) }}
          more={{ title: 'Choose another time', onPress: () => router.push('/settings/reminder') }}
        />
      ) : null}
      {confirmations.map((line) => (
        <AppText key={line} variant="label" style={styles.confirmation} accessibilityLiveRegion="polite">
          {line}
        </AppText>
      ))}
    </Screen>
  );
}

interface OfferAction {
  title: string;
  onPress: () => void;
}

/**
 * The one offer completion makes (FR-15, FR-17, FR-20), kept compact: no
 * filled buttons, so Done stays the screen's one filled action.
 */
function OfferCard({ title, body, detail, yes, no, more }: { title: string; body: string; detail?: string | null; yes: OfferAction; no?: OfferAction; more?: OfferAction }) {
  return (
    <Card style={styles.offer}>
      <AppText variant="overline" accessibilityRole="header">
        {title}
      </AppText>
      <AppText style={styles.offerBody}>{body}</AppText>
      {detail ? (
        <AppText variant="bodyStrong" style={styles.offerDetail}>
          {detail}
        </AppText>
      ) : null}
      <View style={styles.offerActions}>
        <Button title={yes.title} variant="secondary" style={styles.offerYes} onPress={yes.onPress} />
        {no ? <Button title={no.title} variant="quiet" style={styles.link} onPress={no.onPress} /> : null}
      </View>
      {more ? (
        <Pressable onPress={more.onPress} accessibilityRole="button" hitSlop={4} style={({ pressed }) => [styles.more, pressed && styles.pressed]}>
          <AppText variant="label">{more.title}</AppText>
        </Pressable>
      ) : null}
    </Card>
  );
}

/** The next phase's first session: “In 4 · Out 7, each side · 7 min”. */
function phaseDetail(result: Extract<ProgramResult, { kind: 'phase' }>): string | null {
  const part = sessionRun(result.enrollment.definition, result.phase.next.first)?.parts[0];
  return part ? `${rhythmLine(part.steps)} · ${describeTarget(part.target)}` : null;
}

const CHECK_HALO = [
  { offset: 0, color: '#FFFFFF', opacity: 0.9 },
  { offset: 0.68, color: '#FFFFFF', opacity: 0 },
];

/** The check in a frosted circle with a soft halo; dim at night. */
function CheckMark({ night }: { night: boolean }) {
  const glass = useGlass();
  return (
    <View style={styles.mark} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      {night ? null : <Halo stops={CHECK_HALO} size={108} style={styles.markHalo} />}
      <View style={[styles.markDisc, night ? styles.nightMark : { backgroundColor: glass.solid ? colors.surface : 'rgba(255, 255, 255, 0.8)', borderColor: colors.glassRim }]}>
        <Svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke={night ? NIGHT.accent : colors.pine} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M5 12.5l4.5 4.5L19 7.5" />
        </Svg>
      </View>
    </View>
  );
}

const REMINDER_ANSWER: Record<NonNullable<ReminderOffer['answer']>, (time: ReminderOffer) => string> = {
  on: (time) => `✓ Viram will remind you each day at ${reminderTime(time)}. Change it anytime in Settings.`,
  denied: () => 'Notifications are off for Viram, so there’s no reminder. Allow them in your device settings, then turn it on in Settings.',
  declined: () => 'Viram won’t ask again. The reminder is in Settings whenever you want it.',
};

const TIMES = ['', 'once', 'twice', 'three times', 'four times', 'five times', 'six times', 'seven times', 'eight times', 'nine times', 'ten times'];
const timesWord = (count: number) => TIMES[count] ?? `${count} times`;

function nextTimeMessage(choice: NextTime, offer: Offer | null): string | null {
  if (!choice) return null;
  if (choice.kind === 'next' || choice.kind === 'easier') {
    const { practice } = choice;
    return `✓ Next time, Breathe starts ${practice.name} at ${describeRhythm(practice.steps)} for ${describeTarget(practice.target)}.`;
  }
  if (choice.kind === 'stopped' && offer) return `Viram won’t suggest changes to ${offer.current.name} again.`;
  return null;
}

const styles = StyleSheet.create({
  mark: { width: 64, height: 64, marginTop: spacing.md },
  markHalo: { position: 'absolute', left: -22, top: -22 },
  markDisc: { width: 64, height: 64, borderRadius: 32, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  nightMark: { backgroundColor: NIGHT.cardMuted, borderColor: NIGHT.cardMuted },
  hero: { fontSize: 38, lineHeight: 44, marginTop: spacing.sm },
  line: { fontSize: 17, lineHeight: 24, color: colors.inkSoftOnWash, marginTop: -6 },
  saved: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: -4 },
  savedText: { fontFamily: fonts.sansSemibold, color: colors.pine },
  warning: { color: colors.danger },
  offer: { marginTop: spacing.sm },
  offerBody: { lineHeight: 23 },
  offerDetail: { fontSize: 15, lineHeight: 20, color: colors.pine },
  offerActions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm, marginTop: 4 },
  offerYes: { paddingHorizontal: 18, paddingVertical: 10 },
  more: { alignSelf: 'flex-start', minHeight: touchTarget, justifyContent: 'center' },
  pressed: { opacity: 0.7 },
  confirmation: { color: colors.pine },
  links: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' },
  link: { paddingHorizontal: spacing.ms },
  dot: { color: colors.inkFaint },
});
