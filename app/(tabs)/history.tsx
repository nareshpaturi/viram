import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { describeRhythm, formatClock } from '../../src/breathing/describe';
import { AppText } from '../../src/components/AppText';
import { Button } from '../../src/components/Button';
import { ListRow, RowGroup } from '../../src/components/ListRow';
import { Screen } from '../../src/components/Screen';
import { groupByDay, timeLabel } from '../../src/history/format';
import type { SessionRecord } from '../../src/history/repository';
import { stores } from '../../src/storage';
import { colors, spacing } from '../../src/theme';

type Load = { status: 'loading' } | { status: 'failed' } | { status: 'ready'; records: SessionRecord[] };

function load(): Load {
  try {
    return { status: 'ready', records: stores().history.list() };
  } catch {
    return { status: 'failed' };
  }
}

/** History (FR-05): a quiet record, grouped by day. No streaks, scores, or charts. */
export default function History() {
  const [state, setState] = useState<Load>({ status: 'loading' });
  useFocusEffect(useCallback(() => setState(load()), []));

  return (
    <Screen>
      <AppText variant="title" accessibilityRole="header">
        Your practice
      </AppText>
      <AppText style={styles.muted}>A record of the space you made.</AppText>
      {state.status === 'loading' ? <AppText variant="label">Loading your practice…</AppText> : null}
      {state.status === 'failed' ? (
        <View style={styles.empty}>
          <AppText variant="heading">Couldn’t load History.</AppText>
          <AppText style={styles.muted}>Your records are still on this device.</AppText>
          <Button title="Try again" variant="secondary" onPress={() => setState(load())} />
        </View>
      ) : null}
      {state.status === 'ready' && state.records.length === 0 ? (
        <View style={styles.empty}>
          <AppText variant="hero" accessibilityRole="header">
            Your first pause{'\n'}starts here.
          </AppText>
          <AppText style={styles.muted}>Your practices will appear here, saved on this device.</AppText>
          <Button title="Go to Breathe" onPress={() => router.navigate('/')} />
        </View>
      ) : null}
      {state.status === 'ready'
        ? groupByDay(state.records).map((group) => (
            <RowGroup key={group.title} title={group.title}>
              {group.data.map((record) => (
                <ListRow
                  key={record.id}
                  title={record.name}
                  trailing={formatClock(record.activeMs)}
                  subtitle={`${describeRhythm(record.steps)} · ${record.completedRounds} ${record.completedRounds === 1 ? 'round' : 'rounds'}`}
                  detail={`${timeLabel(record.startedAt)} · ${record.outcome === 'completed' ? 'Saved on this device' : 'Ended early · saved here'}`}
                  onPress={() => router.push({ pathname: '/session/[id]', params: { id: record.id } })}
                />
              ))}
            </RowGroup>
          ))
        : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  muted: { color: colors.inkSoft },
  empty: { gap: spacing.md, marginTop: spacing.lg },
});
