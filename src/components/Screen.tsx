import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets, type Edge } from 'react-native-safe-area-context';
import { useWash } from '../light/light';
import { NIGHT, useSurface } from '../night/surface';
import { colors, spacing } from '../theme';

interface Props {
  children: ReactNode;
  /** Actions pinned below the scrolling content; they never scroll away. */
  footer?: ReactNode;
  /** Stack screens with a native header don't need the top inset. */
  edges?: Edge[];
  /** Drawn full-bleed behind everything, e.g. a Soft Light wash. */
  background?: ReactNode;
}

/**
 * Paper, or a Soft Light wash, with a 24 px inset; scrollable so nothing
 * clips at 200% text. On a wash the pinned actions float in the light.
 */
export function Screen({ children, footer, edges = ['top', 'left', 'right'], background }: Props) {
  const { night } = useSurface();
  const lit = (useWash() !== null || background !== undefined) && !night;
  // In the light the pinned actions float; above a home indicator they sit
  // right on its inset, as the Soft Light boards draw them.
  const { bottom } = useSafeAreaInsets();
  return (
    <SafeAreaView style={[styles.safe, night && styles.night, lit && styles.lit]} edges={footer ? [...edges, 'bottom'] : edges}>
      {background}
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
      {footer ? (
        <View style={[styles.footer, night && styles.nightFooter, lit && styles.litFooter, lit && bottom > 0 && styles.litFooterInset]}>{footer}</View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  night: { backgroundColor: NIGHT.background },
  lit: { backgroundColor: 'transparent' },
  litFooter: { backgroundColor: 'transparent', borderTopWidth: 0 },
  litFooterInset: { paddingBottom: 0 },
  nightFooter: { backgroundColor: NIGHT.background, borderTopColor: NIGHT.cardBorder },
  content: { padding: spacing.lg, paddingBottom: spacing.xl, gap: spacing.md },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.ms,
    paddingBottom: spacing.md,
    gap: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
    backgroundColor: colors.background,
  },
});
