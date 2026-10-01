import { Pressable, StyleSheet, View, type PressableProps, type ViewStyle } from 'react-native';
import { useGlass } from '../light/light';
import { NIGHT, useSurface } from '../night/surface';
import { colors, primaryHeight, radius, shadows, spacing, touchTarget } from '../theme';
import { AppText } from './AppText';

type Variant = 'primary' | 'secondary' | 'quiet' | 'destructive' | 'onPine' | 'onPineQuiet';

interface Props extends Omit<PressableProps, 'style' | 'children'> {
  title: string;
  variant?: Variant;
  style?: ViewStyle;
}

const SURFACE: Record<Variant, ViewStyle> = {
  primary: { backgroundColor: colors.primary, minHeight: primaryHeight, boxShadow: shadows.primary },
  secondary: { borderWidth: 1 },
  quiet: { backgroundColor: 'transparent' },
  destructive: { borderWidth: 1, borderColor: colors.danger },
  onPine: { backgroundColor: 'rgba(255, 255, 255, 0.94)', minHeight: primaryHeight },
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

/** Pills (Soft Light). One filled action per light screen: Begin, Resume, Done. Labels wrap at large text. */
export function Button({ title, variant = 'primary', style, disabled, ...props }: Props) {
  const { night } = useSurface();
  const glass = useGlass();
  const label = night && (variant === 'primary' || variant === 'onPine') ? NIGHT.textStrong : LABEL[variant];
  // Secondary and destructive pills are frosted, keeping their 3:1 outline.
  const frosted =
    !night && variant === 'secondary'
      ? { backgroundColor: glass.fill, borderColor: glass.outline }
      : !night && variant === 'destructive'
        ? { backgroundColor: glass.fill }
        : null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      {...props}
      style={({ pressed }) => [
        styles.base,
        (night ? NIGHT_SURFACE : SURFACE)[variant],
        frosted,
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
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
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { textAlign: 'center' },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.45, boxShadow: 'none' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.ms },
});
