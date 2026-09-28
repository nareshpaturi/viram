import { Pressable, StyleSheet, View } from 'react-native';
import type { MonthSummary } from '../history/calendar';
import { colors, fonts, radius, spacing, touchTarget } from '../theme';
import { AppText } from './AppText';
import { Card } from './Card';
import { Stat, StatRow } from './Stat';

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

interface Props {
  summary: MonthSummary;
  onPrevious: () => void;
  /** Absent for the current month; the calendar never shows the future. */
  onNext?: () => void;
  today: number | null;
}

/**
 * A month of practice (FR-16): a pine dot on each practiced day, days and
 * minutes this month, and minutes by practice. Nothing marks a missed day.
 * Screen readers get the month as one sentence instead of 30 cells.
 */
export function MonthCalendar({ summary, onPrevious, onNext, today }: Props) {
  const cells: (MonthSummary['days'][number] | null)[] = [...new Array(summary.leadingBlanks).fill(null), ...summary.days];
  while (cells.length % 7) cells.push(null);

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <MonthButton label="‹" spoken="Previous month" onPress={onPrevious} />
        <AppText variant="bodyStrong" accessibilityRole="header">
          {summary.title}
        </AppText>
        <MonthButton label="›" spoken="Next month" onPress={onNext} />
      </View>
      <View accessible accessibilityLabel={summary.spoken} style={styles.grid}>
        {WEEKDAYS.map((d, i) => (
          <View key={`w${i}`} style={styles.cell}>
            <AppText variant="label" style={styles.weekday}>
              {d}
            </AppText>
          </View>
        ))}
        {cells.map((day, i) => (
          <View key={i} style={styles.cell}>
            {day ? (
              <>
                <AppText variant="label" style={[styles.date, day.date === today && styles.today]}>
                  {day.date}
                </AppText>
                <View style={[styles.dot, day.practiced && styles.dotOn]} />
              </>
            ) : null}
          </View>
        ))}
      </View>
      <StatRow>
        <Stat value={String(summary.daysPracticed)} label={summary.daysPracticed === 1 ? 'Day practiced' : 'Days practiced'} />
        <Stat value={String(summary.minutes)} label={summary.minutes === 1 ? 'Minute' : 'Minutes'} />
      </StatRow>
      {summary.byPractice.length ? (
        <Card>
          <AppText variant="overline" accessibilityRole="header">
            BY PRACTICE
          </AppText>
          {summary.byPractice.map((p) => (
            <View key={p.name} style={styles.row} accessible accessibilityLabel={`${p.name}, ${p.minutes} ${p.minutes === 1 ? 'minute' : 'minutes'}`}>
              <AppText style={styles.flex}>{p.name}</AppText>
              <AppText variant="label">{p.minutes} min</AppText>
            </View>
          ))}
        </Card>
      ) : (
        <AppText variant="label">No practice this month yet.</AppText>
      )}
    </View>
  );
}

function MonthButton({ label, spoken, onPress }: { label: string; spoken: string; onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={spoken}
      accessibilityState={{ disabled: !onPress }}
      hitSlop={4}
      style={({ pressed }) => [styles.monthButton, pressed && styles.pressed, !onPress && styles.hidden]}
    >
      <AppText variant="heading" style={styles.chevron}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  monthButton: { width: touchTarget, height: touchTarget, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  pressed: { backgroundColor: colors.surfaceMuted },
  hidden: { opacity: 0 },
  chevron: { color: colors.pine },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: spacing.xs, gap: 3 },
  weekday: { color: colors.inkSoft },
  date: { color: colors.ink, minWidth: 28, textAlign: 'center', borderRadius: radius.pill },
  today: { color: colors.pine, fontFamily: fonts.sansBold, textDecorationLine: 'underline' },
  dot: { width: 6, height: 6, borderRadius: 3 },
  dotOn: { backgroundColor: colors.pine },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 32 },
  flex: { flex: 1 },
});
