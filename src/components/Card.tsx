import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { NIGHT, useSurface } from '../night/surface';
import { colors, radius, spacing } from '../theme';

export function Card({ children, muted, style }: { children: ReactNode; muted?: boolean; style?: ViewStyle }) {
  const { night } = useSurface();
  return <View style={[styles.card, muted && styles.muted, night && (muted ? styles.nightMuted : styles.night), style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.divider,
    padding: spacing.md,
    gap: spacing.sm,
  },
  muted: { backgroundColor: colors.surfaceMuted, borderColor: colors.surfaceMuted },
  night: { backgroundColor: NIGHT.card, borderColor: NIGHT.cardBorder },
  nightMuted: { backgroundColor: NIGHT.cardMuted, borderColor: NIGHT.cardMuted },
});
