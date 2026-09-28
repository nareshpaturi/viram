import { useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { describeRhythm, formatClock } from '../src/breathing/describe';
import { formatPace } from '../src/breathing/rhythm';
import { AppText } from '../src/components/AppText';
import { Button } from '../src/components/Button';
import { Card } from '../src/components/Card';
import { ConfirmPanel } from '../src/components/ConfirmPanel';
import { Stat, StatRow } from '../src/components/Stat';
import { Screen } from '../src/components/Screen';
import { parseRecord, type SessionRecord } from '../src/history/repository';
import { practiceHref } from '../src/practice/launch';
import { subtitleOf } from '../src/practice/practice';
import { practiceFromRecord } from '../src/quickstart/quickActions';
import { refreshQuickActions } from '../src/quickstart/QuickActionsBridge';
import { usePreferences } from '../src/settings/PreferencesProvider';
import { stores } from '../src/storage';
import { colors, spacing } from '../src/theme';

type SaveState = 'saving' | 'saved' | 'failed' | 'leaving';

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
  const params = useLocalSearchParams<{ record?: string }>();
  const record = useMemo(() => {
    try {
      return params.record ? parseRecord(JSON.parse(params.record)) : null;
    } catch {
      return null;
    }
  }, [params.record]);
  const { preferences } = usePreferences();
  const [state, setState] = useState<SaveState>('saving');

  useEffect(() => {
    if (!record) return;
    const result = save(record);
    setState(result);
    if (result === 'saved') refreshQuickActions(preferences);
    AccessibilityInfo.announceForAccessibility(result === 'saved' ? 'Practice complete. Saved on this device.' : 'Practice finished. It could not be saved yet.');
    // Save once per record.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record]);

  if (!record) return <Redirect href="/" />;

  const practice = practiceFromRecord(record);
  const completed = record.outcome === 'completed';
  const done = () => router.replace('/');
  const again = practice ? () => router.replace(practiceHref(practice)) : undefined;

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

  const failed = state === 'failed';
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
            {again ? <Button title="Breathe again" variant="secondary" onPress={again} /> : null}
          </>
        )
      }
    >
      <View style={styles.mark} importantForAccessibility="no">
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
        <Stat value={String(record.completedRounds)} label="Complete rounds" />
      </StatRow>
      <Card>
        <AppText variant="bodyStrong">{[record.name, practice && subtitleOf(practice)].filter(Boolean).join(' · ')}</AppText>
        <AppText variant="label">
          {describeRhythm(record.steps)} · guided {formatPace(record.breathsPerMinute)} breaths/min
        </AppText>
      </Card>
      <AppText variant="label" style={failed ? styles.warning : undefined}>
        {failed ? 'Try saving again before leaving this screen.' : state === 'saved' ? '✓ Saved on this device' : 'Saving…'}
      </AppText>
    </Screen>
  );
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
  check: { color: colors.pine },
  muted: { color: colors.inkSoft },
  warning: { color: colors.danger },
});
