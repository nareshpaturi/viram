import { useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { describePlan, describeRhythm, describeTarget, formatClock } from '../src/breathing/describe';
import { formatPace } from '../src/breathing/rhythm';
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
import { practiceFromRecord } from '../src/quickstart/quickActions';
import { refreshQuickActions } from '../src/quickstart/QuickActionsBridge';
import { NIGHT, SurfaceProvider, useSurface } from '../src/night/surface';
import { usePreferences } from '../src/settings/PreferencesProvider';
import { stores } from '../src/storage';
import { colors, spacing } from '../src/theme';

type SaveState = 'saving' | 'saved' | 'failed' | 'leaving';
/** What the practitioner chose for next time, if anything (FR-15). */
type NextTime = { kind: 'next' | 'easier'; practice: Practice } | { kind: 'notNow' | 'stopped' } | null;

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
  // Night practice finishes on the same surface it ran on (FR-23).
  return (
    <SurfaceProvider setting="off" night={night === '1'}>
      {night === '1' ? <StatusBar style="light" /> : null}
      <CompleteScreen />
    </SurfaceProvider>
  );
}

function CompleteScreen() {
  const params = useLocalSearchParams<{ record?: string }>();
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
  const easier = useMemo(() => (record ? easierPractice(record) : null), [record]);

  useEffect(() => {
    if (!record) return;
    const result = save(record);
    setState(result);
    if (result === 'saved') {
      refreshQuickActions(preferences);
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
  return (
    <Screen
      edges={['top', 'left', 'right']}
      footer={
        failed ? (
          <>
            <Button title="Try saving again" onPress={() => setState(save(record))} />
            <Button title="Leave without saving" variant="secondary" onPress={() => setState('leaving')} />
          </>
        ) : (
          <>
            <Button title="Done" onPress={done} />
            {again ? <Button title={routine ? 'Back to routine' : 'Breathe again'} variant="secondary" onPress={again} /> : null}
          </>
        )
      }
    >
      <View style={[styles.mark, surface.night && styles.nightMark]} importantForAccessibility="no">
        <AppText variant="heading" style={styles.check}>
          ✓
        </AppText>
      </View>
      <AppText variant="hero" accessibilityRole="header">
        {failed ? 'Your practice finished.' : completed ? 'A little space,\nmade.' : 'A pause still counts.'}
      </AppText>
      <AppText style={styles.muted}>
        {failed
          ? 'We couldn’t save it to History yet.'
          : completed
            ? 'Take a moment before moving on.'
            : 'Your practice is saved as ended early.'}
      </AppText>
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
            {describeRhythm(record.steps)} · guided {formatPace(record.breathsPerMinute)} breaths/min
          </AppText>
        </Card>
      )}
      <AppText variant="label" style={failed ? styles.warning : undefined}>
        {failed ? 'Try saving again before leaving this screen.' : saved ? '✓ Saved on this device' : 'Saving…'}
      </AppText>
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
      {saved && easier && !nextTime ? (
        <Button title="Make it easier next time" variant="quiet" onPress={() => chooseNext({ kind: 'easier', practice: easier })} />
      ) : null}
    </Screen>
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
  mark: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.mist,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  nightMark: { backgroundColor: NIGHT.cardMuted },
  check: { color: colors.pine },
  muted: { color: colors.inkSoft },
  warning: { color: colors.danger },
  nextTime: { color: colors.pine },
  flex: { flexGrow: 1, flexBasis: 140 },
});
