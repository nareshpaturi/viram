/**
 * Haptic patterns that differ by phase (FR-03; research gap 1). The
 * pacer studies behind this found that people tell inhale from exhale by a
 * vibration's rhythm or length, not its strength, and that the exhale wants
 * the emphasis; users ask for vibration through the whole breath and for
 * turning the exhale's off. So:
 *
 *   Marks (default)    inhale: a rising double tap · hold: one light tap ·
 *                      exhale: one long, soft buzz · rest: one faint tap
 *   Through the breath inhale: quick taps, growing, all through it ·
 *                      exhale: the long buzz, then slow taps, fading ·
 *                      hold and rest: as Marks
 *
 * Each phase can be switched off. Strength scales every pulse. Pure data,
 * so the phone engines (Core Haptics, Android waveforms) and the watch apps
 * play the same patterns, and tests can read them.
 */
import type { StepKind } from '../breathing/rhythm';
import type { HapticStrength } from '../breathing/timeline';

export type HapticStyle = 'marks' | 'through';
export type HapticPhases = Record<StepKind, boolean>;

export const DEFAULT_HAPTIC_PHASES: HapticPhases = { inhale: true, hold: true, exhale: true, rest: true };

/** One vibration: when it starts within the step, how long, and how strong (0–1). */
export interface Pulse {
  atMs: number;
  ms: number;
  amplitude: number;
}

const STRENGTH: Record<HapticStrength, number> = { light: 0.55, medium: 0.8, strong: 1 };

/** Taps through a step stop this long before it ends, so they never blur into the next step's mark. */
const TAIL_MS = 350;
const INHALE_EVERY_MS = 450;
const EXHALE_EVERY_MS = 1000;
const LONG_MS = 320;

const MARKS: Record<StepKind, Pulse[]> = {
  inhale: [
    { atMs: 0, ms: 22, amplitude: 0.5 },
    { atMs: 90, ms: 30, amplitude: 1 },
  ],
  hold: [{ atMs: 0, ms: 18, amplitude: 0.6 }],
  exhale: [{ atMs: 0, ms: LONG_MS, amplitude: 0.7 }],
  rest: [{ atMs: 0, ms: 16, amplitude: 0.4 }],
};

/** Evenly spaced taps after the mark, from `first` to `last` amplitude. */
function taps(stepMs: number, startMs: number, everyMs: number, ms: number, first: number, last: number): Pulse[] {
  const out: Pulse[] = [];
  const end = stepMs - TAIL_MS;
  const count = Math.floor((end - startMs) / everyMs) + 1;
  for (let i = 0; i < count; i++) {
    const f = count > 1 ? i / (count - 1) : 0;
    out.push({ atMs: startMs + i * everyMs, ms, amplitude: Math.round((first + (last - first) * f) * 100) / 100 });
  }
  return out.filter((p) => p.atMs + p.ms <= end);
}

/** The pulses for one step, already scaled by strength; empty when the phase is off. */
export function hapticPattern(kind: StepKind, stepMs: number, style: HapticStyle, strength: HapticStrength, phases: HapticPhases = DEFAULT_HAPTIC_PHASES): Pulse[] {
  if (!phases[kind] || stepMs <= 0) return [];
  let pulses = MARKS[kind];
  if (style === 'through' && kind === 'inhale') pulses = [...pulses, ...taps(stepMs, INHALE_EVERY_MS, INHALE_EVERY_MS, 20, 0.35, 0.9)];
  if (style === 'through' && kind === 'exhale') pulses = [...pulses, ...taps(stepMs, LONG_MS + EXHALE_EVERY_MS, EXHALE_EVERY_MS, 60, 0.6, 0.25)];
  const scale = STRENGTH[strength];
  return pulses.filter((p) => p.atMs < stepMs).map((p) => ({ ...p, amplitude: Math.round(p.amplitude * scale * 100) / 100 }));
}

/** “Inhale, exhale, hold” in the order a step plays, for the settings summary. */
export function phasesLine(phases: HapticPhases): string {
  const on = (['inhale', 'hold', 'exhale', 'rest'] as const).filter((k) => phases[k]);
  if (on.length === 4) return 'Every step';
  if (on.length === 0) return 'No steps';
  const names = { inhale: 'inhale', hold: 'hold', exhale: 'exhale', rest: 'rest' };
  const list = on.map((k) => names[k]);
  return list.join(', ').replace(/^./, (c) => c.toUpperCase());
}
