import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { formatClock } from '../../src/breathing/describe';
import { AppText } from '../../src/components/AppText';
import { Button } from '../../src/components/Button';
import { ListRow, RowGroup } from '../../src/components/ListRow';
import { MonthCalendar } from '../../src/components/MonthCalendar';
import { recordLine } from '../../src/components/RoutineParts';
import { Screen } from '../../src/components/Screen';
import { Segmented } from '../../src/components/Segmented';
import { monthOf, monthSummary, shiftMonth, type Month } from '../../src/history/calendar';
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

type HistoryView = 'list' | 'calendar';

/**
 * History (FR-05, FR-16): a quiet record, as a list grouped by day or as a
 * month calendar. No streaks, scores, or charts.
 */
export default function History() {
  const [state, setState] = useState<Load>({ status: 'loading' });
  const [view, setView] = useState<HistoryView>('list');
  const [month, setMonth] = useState<Month>(() => monthOf(Date.now()));
  useFocusEffect(useCallback(() => setState(load()), []));
  const thisMonth = monthOf(Date.now());
  const isThisMonth = month.year === thisMonth.year && month.month === thisMonth.month;
  const hasRecords = state.status === 'ready' && state.records.length > 0;

  return (
    <Screen>
      <AppText variant="title" accessibilityRole="header">
        Your practice
      </AppText>
      <AppText style={styles.muted}>A record of the space you made.</AppText>
      {hasRecords ? (
        <Segmented
          label="Show history as"
          options={[
            { value: 'list', label: 'List' },
            { value: 'calendar', label: 'Calendar' },
          ]}
          value={view}
          onChange={setView}
        />
      ) : null}
      {hasRecords && view === 'calendar' ? (
        <MonthCalendar
          summary={monthSummary(state.records, month)}
          today={isThisMonth ? new Date().getDate() : null}
          onPrevious={() => setMonth(shiftMonth(month, -1))}
          onNext={isThisMonth ? undefined : () => setMonth(shiftMonth(month, 1))}
        />
      ) : null}
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
      {state.status === 'ready' && view === 'list'
        ? groupByDay(state.records).map((group) => (
            <RowGroup key={group.title} title={group.title}>
              {group.data.map((record) => (
                <ListRow
                  key={record.id}
                  title={record.name}
                  trailing={formatClock(record.activeMs)}
                  subtitle={record.program ? `${record.program.name} · session ${record.program.session} · ${recordLine(record)}` : recordLine(record)}
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
