import { StyleSheet, View } from 'react-native';
import { NIGHT, useSurface } from '../night/surface';
import { colors, radius, spacing } from '../theme';
import { AppText } from './AppText';

/** A single practice figure, e.g. “5:04 · Practice time”. */
export function Stat({ value, label }: { value: string; label: string }) {
  const { night } = useSurface();
  return (
    <View style={[styles.stat, night && styles.night]} accessible accessibilityLabel={`${label}: ${value}`}>
      <AppText variant="title" style={styles.value}>
        {value}
      </AppText>
      <AppText variant="label">{label}</AppText>
    </View>
  );
}

export function StatRow({ children }: { children: React.ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  stat: { flexGrow: 1, flexBasis: 120, padding: spacing.md, borderRadius: radius.card, backgroundColor: colors.mist, gap: 2 },
  night: { backgroundColor: NIGHT.cardMuted },
  value: { fontVariant: ['tabular-nums'] },
});
