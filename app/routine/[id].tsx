import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { describeRhythm, formatClock } from '../../src/breathing/describe';
import { sessionPlan } from '../../src/breathing/session';
import { AppText } from '../../src/components/AppText';
import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { Screen } from '../../src/components/Screen';
import { practiceHref } from '../../src/practice/launch';
import { routineSummary } from '../../src/routines/describe';
import { resolveSegment, routineRun, type Routine } from '../../src/routines/repository';
import { stores } from '../../src/storage';
import { colors, spacing } from '../../src/theme';

/** A routine: its practices and minutes, the planned total, and Begin (FR-14). */
export default function RoutineDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [routine, setRoutine] = useState<Routine | null>(null);
  useFocusEffect(useCallback(() => setRoutine(id ? stores().routines.get(id) : null), [id]));

  if (!routine) {
    return (
      <Screen edges={['left', 'right']}>
        <AppText variant="heading">This routine isn’t on this device anymore.</AppText>
        <Button title="Go to Practices" variant="secondary" onPress={() => router.navigate('/practices')} />
      </Screen>
    );
  }

  const s = stores();
  const resolved = routineRun(routine, s.rhythms);
  const parts = routine.segments.map((segment) => resolveSegment(segment, s.rhythms));
  const edit = () => router.push({ pathname: '/routine/edit', params: { id: routine.id } });

  return (
    <Screen
      edges={['left', 'right']}
      footer={
        'run' in resolved ? (
          <Button title="Begin routine" onPress={() => router.push(practiceHref(resolved.run))} />
        ) : (
          <Button title="Edit routine" onPress={edit} />
        )
      }
    >
      <AppText variant="overline">ROUTINE</AppText>
      <AppText variant="title" accessibilityRole="header">
        {routine.name}
      </AppText>
      {'run' in resolved ? <AppText style={styles.muted}>{routineSummary(resolved.run.parts)}</AppText> : null}
      <Card>
        {routine.segments.map((segment, i) => {
          const practice = parts[i];
          return (
            <View key={i} style={styles.row} accessible>
              <AppText variant="bodyStrong" style={styles.number}>
                {i + 1}
              </AppText>
              <View style={styles.text}>
                <AppText variant="bodyStrong">{practice ? practice.name : 'A deleted rhythm'}</AppText>
                <AppText variant="label">{practice ? describeRhythm(practice.steps) : 'Choose another practice in Edit.'}</AppText>
              </View>
              <AppText variant="label" style={styles.time}>
                {practice ? formatClock(sessionPlan(practice.steps, practice.target, practice.slowing ?? null).durationMs) : `${segment.minutes} min`}
              </AppText>
            </View>
          );
        })}
      </Card>
      <AppText variant="label">Five quiet seconds introduce each practice. They aren’t counted as practice time.</AppText>
      {'run' in resolved ? <Button title="Edit" variant="secondary" onPress={edit} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  muted: { color: colors.inkSoft },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.ms, paddingVertical: spacing.xs },
  number: { minWidth: 20, color: colors.inkSoft },
  text: { flex: 1, gap: 2 },
  time: { fontVariant: ['tabular-nums'] },
});
