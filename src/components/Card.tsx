import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { Frosted, useGlass } from '../light/light';
import { NIGHT, useSurface } from '../night/surface';
import { colors, radius, shadows, spacing } from '../theme';

/**
 * Soft Light: a frosted card with a white rim and a soft pine shadow, no
 * outline; solid white with Reduce Transparency. `muted` is a quiet mist
 * card (Take care, notes).
 */
export function Card({ children, muted, style }: { children: ReactNode; muted?: boolean; style?: ViewStyle }) {
  const { night } = useSurface();
  const glass = useGlass();
  const frosted = { backgroundColor: glass.fill, borderColor: glass.rim };
  return (
    <View style={[styles.card, muted ? styles.muted : [frosted, styles.lifted], night && (muted ? styles.nightMuted : styles.night), style]}>
      <Frosted>{children}</Frosted>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.sm,
  },
  lifted: { boxShadow: shadows.card },
  muted: { backgroundColor: colors.surfaceMuted, borderColor: colors.surfaceMuted, borderRadius: 18 },
  night: { backgroundColor: NIGHT.card, borderColor: NIGHT.cardBorder, boxShadow: 'none' },
  nightMuted: { backgroundColor: NIGHT.cardMuted, borderColor: NIGHT.cardMuted },
});
