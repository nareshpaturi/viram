/**
 * Soft Light (docs/branding-design.html, “Soft Light”): everyday screens sit
 * in a wash made only of the brand colors, a pale base with a few wide
 * glows, chosen by the local hour. Pure data, so the contrast check
 * (scripts/check-theme-contrast.mjs) measures the same values the app draws.
 */

export type WashName = 'dawn' | 'day' | 'dusk' | 'night';

export interface GlowStop {
  /** 0–1 along the glow's radius. */
  offset: number;
  color: string;
  opacity: number;
}

/** A radial glow; positions and radii are fractions of the surface, as in CSS `radial-gradient(rx ry at cx cy, …)`. */
export interface Glow {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  stops: GlowStop[];
}

export interface Wash {
  /** CSS gradient angle in degrees: 180 runs top to bottom. */
  angle: number;
  base: { offset: number; color: string }[];
  glows: Glow[];
}

const SKY = '#A8CFD0';
const SAFFRON = '#E4B84A';
const CORAL = '#E46F51';
/** Mist, lightened: rgb(214, 236, 220). */
const MINT = '#D6ECDC';

const glow = (cx: number, cy: number, rx: number, ry: number, color: string, opacity: number, fade: number): Glow => ({
  cx,
  cy,
  rx,
  ry,
  stops: [
    { offset: 0, color, opacity },
    { offset: fade, color, opacity: 0 },
  ],
});

export const WASHES: Record<WashName, Wash> = {
  // 6–11 am: paper warmed by saffron; sky low.
  dawn: {
    angle: 180,
    base: [
      { offset: 0, color: '#FBF5E6' },
      { offset: 0.45, color: '#F4F6EC' },
      { offset: 1, color: '#EAF3EE' },
    ],
    glows: [glow(1, 0, 1.2, 0.7, SAFFRON, 0.36, 0.6), glow(0.88, 0.06, 0.6, 0.4, CORAL, 0.14, 0.7), glow(0, 1, 0.95, 0.6, SKY, 0.5, 0.7)],
  },
  // 11 am–5 pm: mist opening into sky.
  day: {
    angle: 160,
    base: [
      { offset: 0, color: '#EEF6EF' },
      { offset: 0.55, color: '#E3F0EE' },
      { offset: 1, color: '#D9EBEA' },
    ],
    glows: [glow(0, 0, 1.1, 0.7, MINT, 0.95, 0.65), glow(1, 0.35, 1, 0.8, SKY, 0.62, 0.7), glow(0.08, 1, 0.7, 0.45, SAFFRON, 0.14, 0.7)],
  },
  // 5–9 pm: sky above, coral warmth below.
  dusk: {
    angle: 180,
    base: [
      { offset: 0, color: '#E8F1F0' },
      { offset: 0.55, color: '#F3EFE9' },
      { offset: 1, color: '#F7E6DC' },
    ],
    glows: [glow(1, 1, 1.2, 0.6, CORAL, 0.28, 0.65), glow(0, 0.96, 0.9, 0.5, SAFFRON, 0.2, 0.7), glow(0.2, 0, 1, 0.6, SKY, 0.55, 0.7)],
  },
  // 9 pm–6 am: pine into black.
  night: {
    angle: 180,
    base: [
      { offset: 0, color: '#12372F' },
      { offset: 0.55, color: '#0C211C' },
      { offset: 1, color: '#060F0D' },
    ],
    glows: [glow(0.85, 0.04, 0.9, 0.55, SKY, 0.16, 0.7), glow(0, 1, 0.8, 0.5, CORAL, 0.08, 0.7)],
  },
};

/** The technique guide's header plate: always the day light. */
export const PLATE: Wash = {
  angle: 160,
  base: [
    { offset: 0, color: '#EEF6EF' },
    { offset: 1, color: '#DCEDEB' },
  ],
  glows: [glow(0, 0, 1.1, 0.8, MINT, 0.95, 0.65), glow(1, 0.4, 0.9, 0.8, SKY, 0.65, 0.7)],
};

/** Completion: warmth rising from the bottom, over the hour's wash. */
export const BLOOM: Glow = {
  cx: 0.5,
  cy: 1,
  rx: 1.3,
  ry: 0.55,
  stops: [
    { offset: 0, color: CORAL, opacity: 0.26 },
    { offset: 0.4, color: SAFFRON, opacity: 0.16 },
    { offset: 0.72, color: SAFFRON, opacity: 0 },
  ],
};

/** Breathe's soft halo behind the rhythm orb, per wash. */
export const HALO: Record<WashName, GlowStop[]> = {
  dawn: [
    { offset: 0, color: SAFFRON, opacity: 0.22 },
    { offset: 0.45, color: SAFFRON, opacity: 0.08 },
    { offset: 0.7, color: SAFFRON, opacity: 0 },
  ],
  day: [
    { offset: 0, color: '#FFFFFF', opacity: 0.7 },
    { offset: 0.45, color: '#FFFFFF', opacity: 0.25 },
    { offset: 0.7, color: '#FFFFFF', opacity: 0 },
  ],
  dusk: [
    { offset: 0, color: CORAL, opacity: 0.16 },
    { offset: 0.45, color: CORAL, opacity: 0.05 },
    { offset: 0.7, color: CORAL, opacity: 0 },
  ],
  night: [
    { offset: 0, color: SKY, opacity: 0.14 },
    { offset: 0.45, color: SKY, opacity: 0.04 },
    { offset: 0.7, color: SKY, opacity: 0 },
  ],
};

/** The wash for a local hour: dawn 6–11, day 11–17, dusk 17–21, night 21–6. */
export function washAt(date: Date): WashName {
  const hour = date.getHours();
  if (hour >= 6 && hour < 11) return 'dawn';
  if (hour >= 11 && hour < 17) return 'day';
  if (hour >= 17 && hour < 21) return 'dusk';
  return 'night';
}

/**
 * The light tab screens and completion use. Night tab screens need night
 * variants of every shared control, which v1.1 doesn't have yet, so the
 * night hours keep dusk's light for now.
 */
export function everydayWash(date: Date): Exclude<WashName, 'night'> {
  const wash = washAt(date);
  return wash === 'night' ? 'dusk' : wash;
}

/** Endpoints of a CSS gradient angle in a unit box (SVG objectBoundingBox). */
export function angleLine(angle: number): { x1: number; y1: number; x2: number; y2: number } {
  const rad = (angle * Math.PI) / 180;
  const dx = Math.sin(rad) / 2;
  const dy = -Math.cos(rad) / 2;
  const round = (n: number) => Math.round(n * 1000) / 1000;
  return { x1: round(0.5 - dx), y1: round(0.5 - dy), x2: round(0.5 + dx), y2: round(0.5 + dy) };
}

/** Each program card's own light in Practices (Soft Light, “Programs”). */
export const PROGRAM_LIGHT: Record<string, Wash> = {
  // Saffron top-right and sky bottom-left over warm paper.
  foundations: {
    angle: 180,
    base: [
      { offset: 0, color: '#FBF8EF' },
      { offset: 1, color: '#FBF8EF' },
    ],
    glows: [glow(1, 0, 0.9, 0.9, SAFFRON, 0.42, 0.65), glow(0, 1, 0.8, 0.9, SKY, 0.55, 0.7)],
  },
  // Sky into mist into coral, left to right, over white (stops composited over white).
  'nadi-shodhana-path': {
    angle: 90,
    base: [
      { offset: 0, color: '#CBE2E3' },
      { offset: 0.5, color: '#F7FAF7' },
      { offset: 1, color: '#F9DCD5' },
    ],
    glows: [],
  },
};

/** The practice screen: pine deepening downward behind the guide's glow. */
export const PRACTICE_LIGHT: Wash = {
  angle: 180,
  base: [
    { offset: 0, color: '#17423A' },
    { offset: 0.38, color: '#12372F' },
    { offset: 1, color: '#0C211C' },
  ],
  glows: [],
};

/** Welcome's halo behind its large rhythm orb, per wash. */
export const WELCOME_HALO: Record<Exclude<WashName, 'night'>, GlowStop[]> = {
  dawn: [
    { offset: 0, color: SAFFRON, opacity: 0.24 },
    { offset: 0.45, color: SAFFRON, opacity: 0.08 },
    { offset: 0.7, color: SAFFRON, opacity: 0 },
  ],
  day: [
    { offset: 0, color: '#FFFFFF', opacity: 0.75 },
    { offset: 0.45, color: '#FFFFFF', opacity: 0.25 },
    { offset: 0.7, color: '#FFFFFF', opacity: 0 },
  ],
  dusk: [
    { offset: 0, color: CORAL, opacity: 0.16 },
    { offset: 0.45, color: CORAL, opacity: 0.05 },
    { offset: 0.7, color: CORAL, opacity: 0 },
  ],
};
