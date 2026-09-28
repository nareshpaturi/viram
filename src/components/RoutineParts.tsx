import { StyleSheet, View } from 'react-native';
import { describeRhythm, formatClock } from '../breathing/describe';
import type { PartRecord } from '../history/repository';
import { colors, spacing } from '../theme';
import { AppText } from './AppText';
import { Card } from './Card';

/** Each practice a routine reached, with its rounds and time (FR-14 summary). */
export function RoutineParts({ parts }: { parts: PartRecord[] }) {
  return (
    <Card>
      {parts.map((part, i) => {
        const done = part.outcome === 'completed';
        return (
          <View
            key={i}
            style={styles.row}
            accessible
            accessibilityLabel={`${part.name}, ${done ? 'completed' : 'ended early'}, ${part.completedRounds} rounds, ${formatClock(part.activeMs)}`}
          >
            <AppText variant="bodyStrong" style={[styles.mark, !done && styles.ended]}>
              {done ? '✓' : '–'}
            </AppText>
            <View style={styles.text}>
              <AppText variant="bodyStrong">{part.name}</AppText>
              <AppText variant="label">
                {describeRhythm(part.steps)} · {part.completedRounds} {part.completedRounds === 1 ? 'round' : 'rounds'}
                {done ? '' : ' · ended early'}
              </AppText>
            </View>
            <AppText variant="label" style={styles.time}>
              {formatClock(part.activeMs)}
            </AppText>
          </View>
        );
      })}
    </Card>
  );
}

/** One line for History rows: the practice's rhythm, or a routine's practices. */
export function recordLine(record: { parts: PartRecord[] | null; steps: Parameters<typeof describeRhythm>[0]; completedRounds: number }): string {
  if (record.parts) return record.parts.map((p) => p.name).join(' → ');
  return `${describeRhythm(record.steps)} · ${record.completedRounds} ${record.completedRounds === 1 ? 'round' : 'rounds'}`;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.ms, paddingVertical: spacing.xs },
  mark: { color: colors.pine, minWidth: 16 },
  ended: { color: colors.inkFaint },
  text: { flex: 1, gap: 2 },
  time: { fontVariant: ['tabular-nums'] },
});
