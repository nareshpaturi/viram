import { StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { describePace, describeRhythm, describeSlowing, formatClock, perMinute } from '../../src/breathing/describe';
import { formatPace, planFor } from '../../src/breathing/rhythm';
import { AppText } from '../../src/components/AppText';
import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { RoutineParts } from '../../src/components/RoutineParts';
import { Stat, StatRow } from '../../src/components/Stat';
import { Screen } from '../../src/components/Screen';
import { dayLabel, timeLabel } from '../../src/history/format';
import { stores } from '../../src/storage';
import { colors, spacing } from '../../src/theme';

const CUE_LABEL = { voice: 'Voice cues', tones: 'Tones', silent: 'Silent' } as const;

/** One record, exactly as practiced, even if the rhythm changed later. */
export default function SessionDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const record = id ? stores().history.get(id) : null;

  if (!record) {
    return (
      <Screen edges={['left', 'right']}>
        <AppText variant="heading">This practice isn’t in History anymore.</AppText>
        <Button title="Back to History" variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen edges={['left', 'right']} footer={<Button title="Back to History" variant="secondary" onPress={() => router.back()} />}>
      <AppText variant="overline">{record.outcome === 'completed' ? 'COMPLETED' : 'ENDED EARLY'}</AppText>
      <AppText variant="title" accessibilityRole="header">
        {record.name}
      </AppText>
      <AppText style={styles.muted}>
        {dayLabel(record.startedAt)}, {timeLabel(record.startedAt)}
      </AppText>
      <StatRow>
        <Stat value={formatClock(record.activeMs)} label="Practice time" />
        <Stat value={String(record.parts ? record.parts.length : record.completedRounds)} label={record.parts ? 'Practices' : 'Complete rounds'} />
      </StatRow>
      {record.program ? (
        <AppText variant="label">
          {record.program.name} · session {record.program.session}
        </AppText>
      ) : null}
      {record.parts ? <RoutineParts parts={record.parts} /> : null}
      <Card>
        {record.parts ? null : (
          <>
            <AppText>{describeRhythm(record.steps).replace(/^./, (c) => c.toUpperCase())}</AppText>
            {record.slowing ? <AppText variant="label">{describeSlowing(record.steps, record.slowing)}</AppText> : null}
            <AppText variant="label">
              Guided pace: {perMinute(record.slowing ? describePace(planFor(record.steps, record.target, record.slowing)) : formatPace(record.breathsPerMinute))}
            </AppText>
          </>
        )}
        <AppText variant="label">
          {CUE_LABEL[record.cueMode]}
          {record.haptics ? ' · haptics' : ''}
        </AppText>
        <AppText variant="label">Saved on this device</AppText>
      </Card>
      <AppText variant="label">Details keep the rhythm you practiced, even if you change it later.</AppText>
    </Screen>
  );
}


const styles = StyleSheet.create({
  muted: { color: colors.inkSoft },
});
