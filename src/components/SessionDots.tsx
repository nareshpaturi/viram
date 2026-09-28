import { StyleSheet, View } from 'react-native';
import { colors, spacing } from '../theme';

/**
 * A program's sessions as dots: done, next, and to come. Screen readers get
 * the same as text (“Session 3 of 7 complete”), never the dots alone.
 */
export function SessionDots({ total, done, label }: { total: number; done: number; label: string }) {
  return (
    <View style={styles.row} accessible accessibilityLabel={label}>
      {Array.from({ length: total }, (_, i) => (
        <View key={i} style={[styles.dot, i < done && styles.done, i === done && styles.next]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  dot: { width: 10, height: 10, borderRadius: 5, borderWidth: 1, borderColor: colors.outline },
  done: { backgroundColor: colors.pine, borderColor: colors.pine },
  next: { borderColor: colors.pine, borderWidth: 2 },
});
