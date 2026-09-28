/**
 * Viram visual-system tokens (docs/branding-design.html, “Visual system”).
 *
 * The brand guide owns identity: deep pine, living coral, quiet sky, warm
 * paper, Newsreader display type, and DM Sans interface type. Screens consume
 * the semantic roles and text styles here, never raw values.
 */
import type { TextStyle } from 'react-native';

export const colors = {
  // Brand foundations
  pine: '#12372F',
  pineRaised: '#1C4B40',
  pineDark: '#0C211C',
  mist: '#EEF4EF',
  paper: '#FBFCF8',
  ink: '#17211D',
  inkSoft: '#59675F',
  inkFaint: '#68746D',
  coral: '#E46F51',
  coralDeep: '#963D29',
  clay: '#983F2C',
  saffron: '#E4B84A',
  sky: '#A8CFD0',
  line: '#D5DED6',
  white: '#FFFFFF',

  // Semantic application roles
  background: '#FBFCF8',
  surface: '#FFFFFF',
  surfaceMuted: '#EEF4EF',
  primary: '#12372F',
  primaryDeep: '#0C211C',
  accent: '#E46F51',
  accentDeep: '#963D29',
  divider: '#D5DED6',
  /** Control outlines need 3:1; the decorative line doesn't. */
  outline: '#68746D',
  danger: '#983F2C',
  success: '#1C4B40',
  focus: '#E46F51',
  scrim: 'rgba(12, 33, 28, 0.45)',

  // Immersive practice roles
  practiceBackground: '#12372F',
  practiceSurface: '#1C4B40',
  practiceText: '#FFFFFF',
  practiceTextMuted: '#CBE0D2',
  practiceLine: 'rgba(255, 255, 255, 0.28)',

  // Step cues: one meaning everywhere. Labels always carry the step too.
  phaseInhale: '#A8CFD0',
  phaseHold: '#E4B84A',
  phaseExhale: '#E46F51',
  phaseRest: '#EEF4EF',
} as const;

export const phaseColors = {
  inhale: colors.phaseInhale,
  hold: colors.phaseHold,
  exhale: colors.phaseExhale,
  rest: colors.phaseRest,
} as const;

/** 4, 8, 12, 16, 24, 32, 48; screens inset 24. */
export const spacing = {
  xs: 4,
  sm: 8,
  ms: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

/** 12 controls, 16 cards, 24 sheets. Circles are for the guide and status marks. */
export const radius = {
  control: 12,
  card: 16,
  sheet: 24,
  pill: 999,
} as const;

/** Platform minimum touch target (44 pt iOS, 48 dp Android); the brand uses 48 everywhere. */
export const touchTarget = 48;
export const primaryHeight = 52;

export const fonts = {
  displayMedium: 'Newsreader_500Medium',
  displaySemibold: 'Newsreader_600SemiBold',
  sansRegular: 'DMSans_400Regular',
  sansMedium: 'DMSans_500Medium',
  sansSemibold: 'DMSans_600SemiBold',
  sansBold: 'DMSans_700Bold',
} as const;

export const textStyles = {
  /** Welcome and completion messages. */
  hero: { fontFamily: fonts.displayMedium, fontSize: 36, lineHeight: 42, color: colors.ink },
  /** App and screen titles: 32/36. */
  title: { fontFamily: fonts.displayMedium, fontSize: 32, lineHeight: 38, color: colors.ink },
  /** Section and card headings. */
  heading: { fontFamily: fonts.displayMedium, fontSize: 22, lineHeight: 28, color: colors.ink },
  /** Phase label: 32/38. */
  phase: { fontFamily: fonts.displayMedium, fontSize: 32, lineHeight: 38, color: colors.practiceText },
  body: { fontFamily: fonts.sansRegular, fontSize: 16, lineHeight: 24, color: colors.ink },
  bodyStrong: { fontFamily: fonts.sansSemibold, fontSize: 16, lineHeight: 24, color: colors.ink },
  /** Controls: 16/20, weight 600. */
  control: { fontFamily: fonts.sansSemibold, fontSize: 16, lineHeight: 20, color: colors.ink },
  /** Supporting labels: 13/18. */
  label: { fontFamily: fonts.sansMedium, fontSize: 13, lineHeight: 18, color: colors.inkSoft },
  overline: { fontFamily: fonts.sansSemibold, fontSize: 13, lineHeight: 18, letterSpacing: 0.8, color: colors.inkSoft },
  /** Countdown: 64/72, weight 500, tabular numerals. */
  countdown: { fontFamily: fonts.sansMedium, fontSize: 64, lineHeight: 72, fontVariant: ['tabular-nums'], color: colors.pine },
} satisfies Record<string, TextStyle>;
