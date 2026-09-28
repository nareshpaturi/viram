/**
 * Night practice (FR-23): a true-black settle, practice, and completion
 * surface with a dimmer guide and a soft completion cue. The practice and
 * completion screens provide the surface; shared components read it, so
 * every other screen keeps the day palette. Colors follow the UX mock and
 * are checked for AA by scripts/check-theme-contrast.mjs.
 */
import { createContext, useContext, useState, type ReactNode } from 'react';
import type { StepKind } from '../breathing/rhythm';
import { colors, phaseColors } from '../theme';

export type NightSetting = 'off' | 'evening' | 'always';

/** 9 PM to 6 AM, local time. */
export const NIGHT_START_HOUR = 21;
export const NIGHT_END_HOUR = 6;

export function isNight(setting: NightSetting, now = new Date()): boolean {
  if (setting === 'always') return true;
  if (setting === 'off') return false;
  const hour = now.getHours();
  return hour >= NIGHT_START_HOUR || hour < NIGHT_END_HOUR;
}

export const NIGHT = {
  background: '#000000',
  text: '#C9D6D0',
  textStrong: '#D7E2DD',
  textMuted: '#9FB2AA',
  accent: '#A8CFD0',
  danger: '#E8876F',
  card: '#0B1411',
  cardMuted: '#101C18',
  cardBorder: '#1B2A25',
  button: '#1B2A25',
  buttonBorder: '#5A6B64',
  line: 'rgba(168, 207, 208, 0.2)',
  ring: '#7FA3A4',
  /** The guide's phase colors at 72% brightness, as in the mock. */
  phase: {
    inhale: '#799596',
    hold: '#A48435',
    exhale: '#A4503A',
    rest: '#ABB0AC',
  } satisfies Record<StepKind, string>,
  /** The count inside the dimmed guide. */
  count: '#000000',
  hum: '#A4503A',
} as const;

export interface Surface {
  night: boolean;
  background: string;
  text: string;
  textMuted: string;
  line: string;
  phase: Record<StepKind, string>;
  count: string;
  ring: string;
  hum: string;
}

const DAY: Surface = {
  night: false,
  background: colors.practiceBackground,
  text: colors.practiceText,
  textMuted: colors.practiceTextMuted,
  line: colors.practiceLine,
  phase: phaseColors,
  count: colors.pine,
  ring: colors.sky,
  hum: colors.coral,
};

const NIGHT_SURFACE: Surface = {
  night: true,
  background: NIGHT.background,
  text: NIGHT.textStrong,
  textMuted: NIGHT.textMuted,
  line: NIGHT.line,
  phase: NIGHT.phase,
  count: NIGHT.count,
  ring: NIGHT.ring,
  hum: NIGHT.hum,
};

const SurfaceContext = createContext<Surface>(DAY);

export const useSurface = () => useContext(SurfaceContext);

/** Day text colors and what they become on the night surface. */
const NIGHT_TEXT: Record<string, string> = {
  [colors.ink]: NIGHT.text,
  [colors.inkSoft]: NIGHT.textMuted,
  [colors.inkFaint]: NIGHT.textMuted,
  [colors.pine]: NIGHT.accent,
  [colors.danger]: NIGHT.danger,
  [colors.white]: NIGHT.textStrong,
  [colors.practiceTextMuted]: NIGHT.textMuted,
};

/** A text color for the current surface. */
export function surfaceText(surface: Surface, color: string | undefined): string | undefined {
  return surface.night && color ? (NIGHT_TEXT[color.toUpperCase()] ?? NIGHT_TEXT[color] ?? color) : color;
}

/**
 * Decides night once, when the screen opens, so a practice that crosses
 * 9 PM or 6 AM doesn't change surface halfway through.
 */
export function SurfaceProvider({ setting, night: decided, children }: { setting: NightSetting; night?: boolean; children: ReactNode }) {
  const [night] = useState(() => decided ?? isNight(setting));
  return <SurfaceContext.Provider value={night ? NIGHT_SURFACE : DAY}>{children}</SurfaceContext.Provider>;
}
