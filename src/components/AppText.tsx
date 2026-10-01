import { StyleSheet, Text, useWindowDimensions, type TextProps } from 'react-native';
import { useFrosted, useWash } from '../light/light';
import { surfaceText, useSurface } from '../night/surface';
import { colors, textStyles } from '../theme';

/** Muted text directly on a wash darkens to keep 4.5:1 where the glows peak. */
const ON_WASH: Record<string, string> = { [colors.inkSoft]: colors.inkSoftOnWash, [colors.inkFaint]: colors.inkSoftOnWash };
/** On a frosted surface the brand grey passes; only the faintest grey steps up. */
const ON_FROST: Record<string, string> = { [colors.inkFaint]: colors.inkSoft };

export type TextVariant = keyof typeof textStyles;

/**
 * Body and labels scale to 200% (the PRD's large-text target). Display
 * styles start large, so they grow less and whole words never break.
 */
const MAX_SCALE: Record<TextVariant, number> = {
  hero: 1.4,
  title: 1.5,
  heading: 1.7,
  phase: 1.5,
  countdown: 1.4,
  body: 2,
  bodyStrong: 2,
  control: 2,
  label: 2,
  overline: 2,
};

/**
 * Every piece of copy uses a brand text style; screens never set fonts.
 * Scaling is applied here, to font size and line height together, so text is
 * measured and drawn at the same size (maxFontSizeMultiplier left layout
 * measured at the uncapped size).
 */
export function AppText({ variant = 'body', style, ...props }: TextProps & { variant?: TextVariant }) {
  const { fontScale } = useWindowDimensions();
  const surface = useSurface();
  const wash = useWash();
  const frosted = useFrosted();
  const onLight = wash ? (frosted ? ON_FROST : ON_WASH) : null;
  const flat = StyleSheet.flatten([textStyles[variant], style]);
  const color = flat.color as string | undefined;
  const scale = Math.min(fontScale, MAX_SCALE[variant]);
  const sized = {
    fontSize: (flat.fontSize ?? 16) * scale,
    lineHeight: flat.lineHeight ? flat.lineHeight * scale : undefined,
    // Night practice maps day colors to its own (FR-23).
    color: surface.night ? surfaceText(surface, color) : onLight && color ? (onLight[color] ?? color) : color,
  };
  return <Text {...props} allowFontScaling={false} style={[flat, sized]} />;
}
