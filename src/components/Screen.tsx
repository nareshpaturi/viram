import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { NIGHT, useSurface } from '../night/surface';
import { colors, spacing } from '../theme';

interface Props {
  children: ReactNode;
  /** Actions pinned below the scrolling content; they never scroll away. */
  footer?: ReactNode;
  /** Stack screens with a native header don't need the top inset. */
  edges?: Edge[];
}

/** Paper surface, 24 px inset, scrollable so nothing clips at 200% text. */
export function Screen({ children, footer, edges = ['top', 'left', 'right'] }: Props) {
  const { night } = useSurface();
  return (
    <SafeAreaView style={[styles.safe, night && styles.night]} edges={footer ? [...edges, 'bottom'] : edges}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
      {footer ? <View style={[styles.footer, night && styles.nightFooter]}>{footer}</View> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  night: { backgroundColor: NIGHT.background },
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
