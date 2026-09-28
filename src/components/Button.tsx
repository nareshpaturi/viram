import { Pressable, StyleSheet, View, type PressableProps, type ViewStyle } from 'react-native';
import { NIGHT, useSurface } from '../night/surface';
import { colors, primaryHeight, radius, spacing, touchTarget } from '../theme';
import { AppText } from './AppText';

type Variant = 'primary' | 'secondary' | 'quiet' | 'destructive' | 'onPine' | 'onPineQuiet';

interface Props extends Omit<PressableProps, 'style' | 'children'> {
  title: string;
  variant?: Variant;
  style?: ViewStyle;
}

const SURFACE: Record<Variant, ViewStyle> = {
  primary: { backgroundColor: colors.primary, minHeight: primaryHeight },
  secondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.outline },
  quiet: { backgroundColor: 'transparent' },
  destructive: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.danger },
  onPine: { backgroundColor: colors.practiceText, minHeight: primaryHeight },
  onPineQuiet: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.practiceLine },
};

const LABEL: Record<Variant, string> = {
  primary: colors.white,
  secondary: colors.ink,
  quiet: colors.pine,
  destructive: colors.danger,
  onPine: colors.pine,
  onPineQuiet: colors.practiceText,
};

/** Night practice: quiet dark fills and outlines, no bright surfaces (FR-23). */
const NIGHT_SURFACE: Record<Variant, ViewStyle> = {
  primary: { backgroundColor: NIGHT.button, minHeight: primaryHeight },
  secondary: { backgroundColor: 'transparent', borderWidth: 1, borderColor: NIGHT.buttonBorder },
  quiet: { backgroundColor: 'transparent' },
  destructive: { backgroundColor: 'transparent', borderWidth: 1, borderColor: NIGHT.danger },
  onPine: { backgroundColor: NIGHT.button, minHeight: primaryHeight },
  onPineQuiet: { backgroundColor: 'transparent', borderWidth: 1, borderColor: NIGHT.buttonBorder },
};

/** One filled action per light screen: Begin, Resume, Done. Labels wrap at large text. */
export function Button({ title, variant = 'primary', style, disabled, ...props }: Props) {
  const { night } = useSurface();
  const label = night && (variant === 'primary' || variant === 'onPine') ? NIGHT.textStrong : LABEL[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      {...props}
      style={({ pressed }) => [styles.base, (night ? NIGHT_SURFACE : SURFACE)[variant], pressed && styles.pressed, disabled && styles.disabled, style]}
    >
      <AppText variant="control" style={[styles.label, { color: label }]}>
        {title}
      </AppText>
    </Pressable>
  );
}

/** Two actions side by side that stack when text is large. */
export function ButtonRow({ children }: { children: React.ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

const styles = StyleSheet.create({
  base: {
    minHeight: touchTarget,
    borderRadius: radius.control,
    paddingVertical: spacing.ms,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { textAlign: 'center' },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.45 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.ms },
});
