import { StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { describePace, describeRhythm, describeSlowing, formatClock, perMinute } from '../../src/breathing/describe';
import { formatPace, planFor } from '../../src/breathing/rhythm';
import { AppText } from '../../src/components/AppText';
import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { SessionDots } from '../../src/components/SessionDots';
import { RoutineParts } from '../../src/components/RoutineParts';
import { Stat, StatRow } from '../../src/components/Stat';
import { Screen } from '../../src/components/Screen';
import { HEALTH_NAME, HEALTH_RESULT, healthAvailable, healthEligible } from '../../src/health/health';
import { dayLabel, timeLabel } from '../../src/history/format';
import type { SessionRecord } from '../../src/history/repository';
import { totalSessions } from '../../src/programs/engine';
import { usePreferences } from '../../src/settings/PreferencesProvider';
import { stores } from '../../src/storage';
import { colors } from '../../src/theme';

const CUE_LABEL = { voice: 'Voice cues', tones: 'Tones', silent: 'Silent' } as const;

/**
 * One record, exactly as practiced, even if the rhythm changed later. Also
 * “View practice” from completion (UX03): the numbers, program progress, and
 * Health status live here.
 */
export default function SessionDetail() {
  const { id, from } = useLocalSearchParams<{ id: string; from?: string }>();
  const record = id ? stores().history.get(id) : null;
  const { preferences } = usePreferences();
  const back = <Button title={from === 'complete' ? 'Back' : 'Back to History'} variant="secondary" onPress={() => router.back()} />;

  if (!record) {
    return (
      <Screen edges={['left', 'right']}>
        <AppText variant="heading">This practice isn’t in History anymore.</AppText>
        {back}
      </Screen>
    );
  }

  return (
    <Screen edges={['left', 'right']} footer={back}>
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
      {record.program ? <ProgramProgress record={record} /> : null}
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
        {record.health !== 'none' ? (
          <AppText variant="label">
            {HEALTH_RESULT[record.health].title}
            {record.health === 'failed' ? ' You can retry from Settings.' : ''}
          </AppText>
        ) : null}
      </Card>
      {record.health === 'none' && !preferences.healthConnected && !preferences.healthDismissed && healthEligible(record) && healthAvailable() ? (
        <Button title={`Add sessions to ${HEALTH_NAME}`} variant="quiet" onPress={() => router.push({ pathname: '/health', params: { record: record.id } })} />
      ) : null}
      <AppText variant="label">Details keep the rhythm you practiced, even if you change it later.</AppText>
    </Screen>
  );
}

/** The program this session belongs to, and where it stands now (FR-20). */
function ProgramProgress({ record }: { record: SessionRecord }) {
  const program = record.program!;
  const enrollment = stores().programs.forProgram(program.id);
  const total = enrollment ? totalSessions(enrollment) : null;
  return (
    <Card>
      <AppText variant="bodyStrong">
        {program.name} · session {program.session}
      </AppText>
      {enrollment && total ? (
        <>
          <SessionDots total={total} done={enrollment.completedSessions} label={`${enrollment.completedSessions} of ${total} sessions complete.`} />
          <AppText variant="label">
            {enrollment.state === 'completed' ? 'Program complete.' : `${enrollment.completedSessions} of ${total} sessions complete.`}
          </AppText>
        </>
      ) : null}
      <Button title="View program" variant="quiet" style={styles.start} onPress={() => router.push({ pathname: '/program/[id]', params: { id: program.id } })} />
    </Card>
  );
}

const styles = StyleSheet.create({
  start: { alignSelf: 'flex-start', paddingHorizontal: 0 },
  muted: { color: colors.inkSoft },
});
