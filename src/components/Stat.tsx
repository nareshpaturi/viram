import { StyleSheet, View } from 'react-native';
import { useGlass } from '../light/light';
import { NIGHT, useSurface } from '../night/surface';
import { colors, radius, spacing } from '../theme';
import { AppText } from './AppText';

/** A single practice figure, e.g. “5:04 · Practice time”. */
export function Stat({ value, label }: { value: string; label: string }) {
  const { night } = useSurface();
  const glass = useGlass();
  return (
    <View style={[styles.stat, { backgroundColor: glass.fill, borderColor: glass.rim }, night && styles.night]} accessible accessibilityLabel={`${label}: ${value}`}>
      <AppText variant="title" style={[styles.value, !night && styles.pine]}>
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
  /** Frosted tiles; Newsreader values in pine. */
  stat: { flexGrow: 1, flexBasis: 120, padding: spacing.md, borderRadius: radius.card, borderWidth: 1, gap: 2 },
  night: { backgroundColor: NIGHT.cardMuted, borderColor: NIGHT.cardMuted },
  pine: { color: colors.pine },
  value: { fontVariant: ['tabular-nums'] },
});
