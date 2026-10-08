/**
 * The air in the nose drawing (batch 3): a curve into the left nostril in a
 * 300 viewBox, mirrored for the right. On inhale a short sky trace moves up
 * the curve into the open nostril; on exhale it runs back out, in coral. It
 * is placed from step progress on the session clock, never from a timer.
 */
import type { StepKind } from '../breathing/rhythm';

export interface Pt {
  x: number;
  y: number;
}
export type Curve = readonly [Pt, Pt, Pt, Pt];

/** From below and to the left, into the left nostril (Welcome's drawing, mirror view). */
export const AIR: Curve = [
  { x: 104, y: 256 },
  { x: 106, y: 232 },
  { x: 120, y: 210 },
  { x: 136, y: 192 },
];

/**
 * The slash over a closed left nostril, mirrored for the right. (The board
 * draws M156 176L169 189 over the right nostril for “Inhale left”; this is
 * its mirror, so every shape here is drawn for the left side.)
 */
export const SLASH: readonly [Pt, Pt] = [
  { x: 144, y: 176 },
  { x: 131, y: 189 },
];

/** Left is drawn; right is its mirror across the nose (x = 150). */
export const mirror = (p: Pt): Pt => ({ x: 300 - p.x, y: p.y });
export const onSide = <T extends readonly Pt[]>(points: T, side: 'left' | 'right'): T => (side === 'left' ? points : (points.map(mirror) as unknown as T));

type Side = 'left' | 'right';
const other = (side: Side): Side => (side === 'left' ? 'right' : 'left');

/** The air's path through the open nostril. */
export const airFor = (open: Side): Curve => onSide(AIR, open);
/** The slash over the closed nostril: always the side opposite the open one. */
export const slashFor = (open: Side): readonly [Pt, Pt] => onSide(SLASH, other(open));

const lerp = (a: Pt, b: Pt, t: number): Pt => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

export function point(c: Curve, t: number): Pt {
  const [a, b, d] = [lerp(c[0], c[1], t), lerp(c[1], c[2], t), lerp(c[2], c[3], t)];
  return lerp(lerp(a, b, t), lerp(b, d, t), t);
}

/** Direction of travel at t, toward the nostril. */
export function tangent(c: Curve, t: number): Pt {
  const u = 1 - t;
  return {
    x: 3 * u * u * (c[1].x - c[0].x) + 6 * u * t * (c[2].x - c[1].x) + 3 * t * t * (c[3].x - c[2].x),
    y: 3 * u * u * (c[1].y - c[0].y) + 6 * u * t * (c[2].y - c[1].y) + 3 * t * t * (c[3].y - c[2].y),
  };
}

/** The part of the curve from t0 to t1, as its own cubic (de Casteljau). */
export function segment(c: Curve, t0: number, t1: number): Curve {
  const split = (curve: Curve, t: number): [Curve, Curve] => {
    const ab = lerp(curve[0], curve[1], t);
    const bc = lerp(curve[1], curve[2], t);
    const cd = lerp(curve[2], curve[3], t);
    const abc = lerp(ab, bc, t);
    const bcd = lerp(bc, cd, t);
    const mid = lerp(abc, bcd, t);
    return [
      [curve[0], ab, abc, mid],
      [mid, bcd, cd, curve[3]],
    ];
  };
  const tail = split(c, t0)[1];
  const local = t0 >= 1 ? 0 : (t1 - t0) / (1 - t0);
  return split(tail, local)[0];
}

const n = (v: number) => Math.round(v * 10) / 10;

export const curvePath = (c: Curve) => `M${n(c[0].x)} ${n(c[0].y)}C${n(c[1].x)} ${n(c[1].y)} ${n(c[2].x)} ${n(c[2].y)} ${n(c[3].x)} ${n(c[3].y)}`;
export const linePath = ([a, b]: readonly [Pt, Pt]) => `M${n(a.x)} ${n(a.y)}L${n(b.x)} ${n(b.y)}`;

/** An open arrowhead at `tip`, pointing along `direction`. */
export function arrowHead(tip: Pt, direction: Pt, back = 9, half = 5.5): string {
  const length = Math.hypot(direction.x, direction.y) || 1;
  const u = { x: direction.x / length, y: direction.y / length };
  const base = { x: tip.x - u.x * back, y: tip.y - u.y * back };
  const left = { x: base.x - u.y * half, y: base.y + u.x * half };
  const right = { x: base.x + u.y * half, y: base.y - u.x * half };
  return `M${n(left.x)} ${n(left.y)}L${n(tip.x)} ${n(tip.y)}L${n(right.x)} ${n(right.y)}`;
}

/** How much of the curve the moving trace covers. */
export const TRACE = 0.35;

export interface Air {
  /** The visible part of the curve, as curve parameters 0 (outside) to 1 (nostril). */
  from: number;
  to: number;
  /** Where the arrowhead sits, and whether it points in (inhale) or out (exhale). */
  head: number;
  inward: boolean;
}

/**
 * Where the air is, `progress` (0–1) through the step: inhale travels in and
 * comes to rest at the nostril; exhale leaves it and travels out. Hold and
 * rest have no air. A still trace (reduced motion) is the whole arrow.
 */
export function airAt(kind: StepKind, progress: number, still = false): Air | null {
  if (kind === 'hold' || kind === 'rest') return null;
  const inward = kind === 'inhale';
  if (still) return { from: 0, to: 1, head: inward ? 1 : 0, inward };
  const p = Math.min(1, Math.max(0, progress));
  // Eased out, like a breath filling or emptying.
  const travelled = 0.2 + 0.8 * (1 - (1 - p) * (1 - p));
  if (inward) return { from: Math.max(0, travelled - TRACE), to: travelled, head: travelled, inward };
  const head = 1 - travelled;
  return { from: head, to: Math.min(1, head + TRACE), head, inward };
}
