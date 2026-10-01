import { useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { describePace, describePlan, describeRhythm, describeTarget, formatClock } from '../src/breathing/describe';
import { formatPace, planFor } from '../src/breathing/rhythm';
import { AppText } from '../src/components/AppText';
import { Button, ButtonRow } from '../src/components/Button';
import { Card } from '../src/components/Card';
import { ConfirmPanel } from '../src/components/ConfirmPanel';
import { RoutineParts } from '../src/components/RoutineParts';
import { Stat, StatRow } from '../src/components/Stat';
import { Screen } from '../src/components/Screen';
import { parseRecord, type SessionRecord } from '../src/history/repository';
import { practiceHref } from '../src/practice/launch';
import { subtitleOf, type Practice } from '../src/practice/practice';
import { easierPractice, OFFER_WINDOW_MS, progressionOffer, type Offer } from '../src/progression/progression';
import { findProgram } from '../src/programs/definitions';
import {
  phaseEndingAt,
  programTotals,
  recordSession,
  repeatPhase,
  sessionLine,
  sessionRun,
  totalSessions,
  type Enrollment,
} from '../src/programs/engine';
import { SessionDots } from '../src/components/SessionDots';
import { HEALTH_NAME, HEALTH_RESULT, healthAvailable, healthEligible, writeToHealth } from '../src/health/health';
import type { HealthState } from '../src/history/repository';
import { refreshReminder } from '../src/reminder/ReminderBridge';
import { practiceFromRecord } from '../src/quickstart/quickActions';
import { refreshQuickActions } from '../src/quickstart/QuickActionsBridge';
import { LightProvider, useEverydayWash, useGlass, useWash } from '../src/light/light';
import { useSvgId, Wash } from '../src/light/Wash';
import { BLOOM, WASHES } from '../src/light/washes';
import { NIGHT, SurfaceProvider, useSurface } from '../src/night/surface';
import Svg, { Circle, Defs, Path, RadialGradient, Stop } from 'react-native-svg';
import { usePreferences } from '../src/settings/PreferencesProvider';
import { stores } from '../src/storage';
import { colors, spacing } from '../src/theme';

type SaveState = 'saving' | 'saved' | 'failed' | 'leaving';
/** What the practitioner chose for next time, if anything (FR-15). */
type NextTime = { kind: 'next' | 'easier'; practice: Practice } | { kind: 'notNow' | 'stopped' } | null;
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
 * Completion (duration contract): actual practice time, complete rounds,
 * rhythm, and guided pace. “Saved on this device” only after the write
 * succeeds; a failed save keeps the result for retry. Nothing else
 * interrupts this screen, and there is never a rating prompt.
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
  const [health, setHealth] = useState<HealthState>('none');
  const easier = useMemo(() => (record ? easierPractice(record) : null), [record]);

  useEffect(() => {
    if (!record) return;
    const result = save(record);
    setState(result);
    if (result === 'saved') {
      refreshQuickActions(preferences);
      // Health writing follows the local save, never replaces it (FR-18).
      if (preferences.healthConnected && healthEligible(record)) {
        setHealth('pending');
        writeToHealth(stores(), record).then(setHealth, () => setHealth('failed'));
      }
      try {
        setProgramResult(applyToProgram(record));
        refreshReminder(preferences);
      } catch {
        // The practice is saved; the program catches up next time it's opened.
      }
      // Worked out once, so answering it doesn't make it disappear mid-sentence.
      const now = Date.now();
      try {
        setOffer(progressionOffer(record, stores().history.between(now - OFFER_WINDOW_MS, now + 1), preferences, now));
      } catch {
        // No offer is better than an interrupted completion screen.
      }
    }
    AccessibilityInfo.announceForAccessibility(result === 'saved' ? 'Practice complete. Saved on this device.' : 'Practice finished. It could not be saved yet.');
    // Save once per record.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record]);

  if (!record) return <Redirect href="/" />;

  const practice = practiceFromRecord(record);
  const completed = record.outcome === 'completed';
  const done = () => router.replace('/');
  const routine = record.source.kind === 'routine' && record.parts ? stores().routines.get(record.source.id) : null;
  const again = practice
    ? () => router.replace(practiceHref(practice))
    : routine
      ? () => router.replace({ pathname: '/routine/[id]', params: { id: routine.id } })
      : undefined;

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

  const failed = state === 'failed';
  const saved = state === 'saved';
  const message = nextTimeMessage(nextTime, offer);
  const viewProgram = record.program
    ? () => router.replace({ pathname: '/program/[id]', params: { id: record.program!.id } })
    : undefined;
  const hero =
    saved && programResult?.kind === 'complete'
      ? `${programResult.enrollment.definition.shortName},\ncomplete.`
      : saved && programResult?.kind === 'phase'
        ? `Phase ${programResult.phase.number},\ncomplete.`
        : null;
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
            <Button title="Done" onPress={done} />
            {viewProgram ? (
              programResult?.kind === 'complete' ? null : <Button title="View program" variant="secondary" onPress={viewProgram} />
            ) : again ? (
              <Button title={routine ? 'Back to routine' : 'Breathe again'} variant="secondary" onPress={again} />
            ) : null}
          </>
        )
      }
    >
      <CheckMark night={surface.night} />
      <AppText variant="hero" accessibilityRole="header">
        {failed ? 'Your practice finished.' : (hero ?? (completed ? 'A little space,\nmade.' : 'A pause still counts.'))}
      </AppText>
      <AppText style={styles.muted}>
        {failed
          ? 'We couldn’t save it to History yet.'
          : completed
            ? 'Take a moment before moving on.'
            : 'Your practice is saved as ended early.'}
      </AppText>
      {/* A phase boundary asks its question first (FR-20). */}
      {saved && programResult?.kind === 'phase' ? <ProgramCard result={programResult} record={record} onChange={setProgramResult} /> : null}
      <StatRow>
        <Stat value={formatClock(record.activeMs)} label="Practice time" />
        {record.parts ? (
          <Stat value={String(record.parts.length)} label={record.parts.length === 1 ? 'Practice' : 'Practices'} />
        ) : (
          <Stat value={String(record.completedRounds)} label="Complete rounds" />
        )}
      </StatRow>
      {record.parts ? <RoutineParts parts={record.parts} /> : null}
      {record.parts ? null : (
        <Card>
          <AppText variant="bodyStrong">{[record.name, practice && subtitleOf(practice)].filter(Boolean).join(' · ')}</AppText>
          <AppText variant="label">
            {describeRhythm(record.steps)} · guided{' '}
            {record.slowing ? describePace(planFor(record.steps, record.target, record.slowing)) : formatPace(record.breathsPerMinute)} breaths/min
          </AppText>
        </Card>
      )}
      <AppText variant="label" style={failed ? styles.warning : undefined}>
        {failed ? 'Try saving again before leaving this screen.' : saved ? '✓ Saved on this device' : 'Saving…'}
      </AppText>
      {saved && health !== 'none' ? (
        <AppText variant="label" accessibilityLiveRegion="polite">
          {health === 'pending' ? `Adding to ${HEALTH_NAME}…` : `${HEALTH_RESULT[health].title}${health === 'failed' ? ' You can retry from Settings.' : ''}`}
        </AppText>
      ) : null}
      {saved && programResult && programResult.kind !== 'phase' ? <ProgramCard result={programResult} record={record} onChange={setProgramResult} /> : null}
      {saved && offer && !nextTime ? (
        <Card>
          <AppText variant="overline" accessibilityRole="header">
            WHEN YOU’RE READY
          </AppText>
          <AppText>
            You’ve completed {offer.current.name} at {describeRhythm(offer.current.steps)} {timesWord(offer.count)} in the last two weeks. {offer.prompt}
          </AppText>
          <Card muted>
            <AppText variant="bodyStrong">
              {describeRhythm(offer.next.steps)} · {describePlan(offer.next.steps, offer.next.target)}
            </AppText>
          </Card>
          <ButtonRow>
            <Button title="Try next time" style={styles.flex} onPress={() => chooseNext({ kind: 'next', practice: offer.next })} />
            <Button title="Not now" variant="secondary" style={styles.flex} onPress={() => chooseNext({ kind: 'notNow' })} />
          </ButtonRow>
          <Button title="Stop suggesting for this practice" variant="quiet" onPress={() => chooseNext({ kind: 'stopped' })} />
        </Card>
      ) : null}
      {message ? (
        <AppText variant="label" style={styles.nextTime}>
          {message}
        </AppText>
      ) : null}
      {saved && health === 'none' && !preferences.healthConnected && !preferences.healthDismissed && healthEligible(record) && healthAvailable() ? (
        <Button
          title={`Add sessions to ${HEALTH_NAME}`}
          variant="quiet"
          onPress={() => router.push({ pathname: '/health', params: { record: record.id } })}
        />
      ) : null}
      {saved && easier && !nextTime ? (
        <Button title="Make it easier next time" variant="quiet" onPress={() => chooseNext({ kind: 'easier', practice: easier })} />
      ) : null}
    </Screen>
  );
}

/** Session progress, a phase decision, or the program's completion (FR-20). */
function ProgramCard({ result, record, onChange }: { result: ProgramResult; record: SessionRecord; onChange: (r: ProgramResult) => void }) {
  const { enrollment } = result;
  const program = enrollment.definition;
  const total = totalSessions(enrollment);
  const session = record.program!.session;

  if (result.kind === 'complete') {
    const minutes = Math.round(
      stores()
        .history.list()
        .filter((r) => r.program?.id === program.id && r.startedAt >= enrollment.startedAt)
        .reduce((sum, r) => sum + r.activeMs, 0) / 60_000,
    );
    const next = program.next ? findProgram(program.next) : undefined;
    return (
      <>
        <StatRow>
          <Stat value={String(total)} label="Sessions" />
          <Stat value={String(minutes)} label="Minutes" />
        </StatRow>
        <AppText>{total} sessions, made at your own pace.</AppText>
        <AppText variant="label">Practiced: {programTotals(program).techniques.join(', ')}</AppText>
        {next ? (
          <Card>
            <AppText variant="overline" accessibilityRole="header">
              A NEXT STEP, IF YOU LIKE
            </AppText>
            <AppText variant="bodyStrong">{next.name}</AppText>
            <AppText variant="label">
              {next.eyebrow}. {next.summary}
            </AppText>
            <Button title="Preview program" variant="secondary" onPress={() => router.replace({ pathname: '/program/[id]', params: { id: next.id } })} />
          </Card>
        ) : null}
      </>
    );
  }

  if (result.kind === 'phase') {
    const nextRun = sessionRun(program, result.phase.next.first);
    const part = nextRun?.parts[0];
    return (
      <Card>
        <AppText>{result.phase.done.summary}</AppText>
        <AppText variant="overline" accessibilityRole="header">
          {program.name.toUpperCase()} · PHASE {result.phase.number + 1}
        </AppText>
        <AppText>{result.phase.next.intro}</AppText>
        {part ? (
          <Card muted>
            <AppText variant="bodyStrong">
              {describeRhythm(part.steps)} · {describePlan(part.steps, part.target)}
            </AppText>
          </Card>
        ) : null}
        <AppText variant="label">If the longer exhale feels like a strain, repeat this phase. There’s no rush.</AppText>
        <ButtonRow>
          <Button
            title={`Move on to phase ${result.phase.number + 1}`}
            style={styles.flex}
            onPress={() => {
              onChange({ kind: 'session', enrollment });
              AccessibilityInfo.announceForAccessibility(`Phase ${result.phase.number + 1} is next.`);
            }}
          />
          <Button
            title="Repeat this phase"
            variant="secondary"
            style={styles.flex}
            onPress={() => {
              const repeated = repeatPhase(enrollment, result.phase.done, Date.now());
              stores().programs.save(repeated);
              onChange({ kind: 'session', enrollment: repeated, repeating: result.phase.number });
              AccessibilityInfo.announceForAccessibility(`Phase ${result.phase.number} again, from session ${result.phase.done.first}.`);
            }}
          />
        </ButtonRow>
      </Card>
    );
  }

  const nextNumber = enrollment.completedSessions + 1;
  const next = program.sessions[nextNumber - 1];
  return (
    <Card>
      <AppText variant="bodyStrong">{program.name}</AppText>
      <AppText>
        {result.repeating
          ? `Phase ${result.repeating} again, from session ${nextNumber}. There’s no rush.`
          : record.outcome === 'completed'
            ? `Session ${session} of ${total} complete.`
            : `Ended early, so session ${nextNumber} stays next. Nothing is lost.`}
      </AppText>
      <SessionDots total={total} done={enrollment.completedSessions} label={`${enrollment.completedSessions} of ${total} sessions complete.`} />
      {next ? (
        <AppText variant="label">
          Next: {sessionLine(next)}.{next.introduces ? ` ${next.introduces}` : ''}
        </AppText>
      ) : null}
    </Card>
  );
}

/** The check in a frosted circle with a soft halo; dim at night. */
function CheckMark({ night }: { night: boolean }) {
  const glass = useGlass();
  const id = useSvgId('check');
  return (
    <View style={styles.mark} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      {night ? null : (
        <Svg width={120} height={120} style={styles.markHalo}>
          <Defs>
            <RadialGradient id={id} cx="0.5" cy="0.5" r="0.5">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.9} />
              <Stop offset="0.68" stopColor="#FFFFFF" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={60} cy={60} r={60} fill={`url(#${id})`} />
        </Svg>
      )}
      <View style={[styles.markDisc, night ? styles.nightMark : { backgroundColor: glass.solid ? colors.surface : 'rgba(255, 255, 255, 0.8)', borderColor: colors.glassRim }]}>
        <Svg width={30} height={30} viewBox="0 0 24 24" fill="none" stroke={night ? NIGHT.accent : colors.pine} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M5 12.5l4.5 4.5L19 7.5" />
        </Svg>
      </View>
    </View>
  );
}

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
  mark: { width: 72, height: 72, marginTop: spacing.md },
  markHalo: { position: 'absolute', left: -24, top: -24 },
  markDisc: { width: 72, height: 72, borderRadius: 36, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  nightMark: { backgroundColor: NIGHT.cardMuted, borderColor: NIGHT.cardMuted },
  muted: { color: colors.inkSoft },
  warning: { color: colors.danger },
  nextTime: { color: colors.pine },
  flex: { flexGrow: 1, flexBasis: 140 },
});
