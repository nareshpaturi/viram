/**
 * Step model and rhythm math (PRD FR-01, FR-02, and the duration contract).
 *
 * Pure and dependency-free: scripts/check-content.mjs imports this file
 * directly with Node's type stripping, so keep runtime imports out of it.
 */

export type StepKind = 'inhale' | 'hold' | 'exhale' | 'rest';

/** One step of a rhythm. Library content adds a caption (src/content/types.ts). */
export interface RhythmStep {
  kind: StepKind;
  /** Inhale and exhale 1–20 s; hold and rest 0–20 s (0 = Off, skipped). */
  seconds: number;
  side?: 'left' | 'right';
  /** Omitted means through the nose. */
  route?: 'mouth';
  /** Shown and spoken instead of the kind word. */
  cue?: 'hum';
}

export type MinuteTarget = 1 | 3 | 5 | 10;
export type Target = { minutes: MinuteTarget } | { rounds: number };
export type Increment = 1 | 0.5;

export const STEP_KINDS: readonly StepKind[] = ['inhale', 'hold', 'exhale', 'rest'];
export const MINUTE_TARGETS: readonly MinuteTarget[] = [1, 3, 5, 10];
export const ROUND_SHORTCUTS = [11, 21, 27] as const;
export const MAX_ROUNDS = 108;
export const MAX_STEP_SECONDS = 20;

export function minSeconds(kind: StepKind): number {
  return kind === 'inhale' || kind === 'exhale' ? 1 : 0;
}

export function isValidSeconds(kind: StepKind, seconds: number, increment: Increment): boolean {
  return (
    Number.isFinite(seconds) &&
    seconds >= minSeconds(kind) &&
    seconds <= MAX_STEP_SECONDS &&
    Number.isInteger(seconds / increment)
  );
}

export function isValidTarget(target: Target): boolean {
  if ('minutes' in target) return MINUTE_TARGETS.includes(target.minutes);
  return Number.isInteger(target.rounds) && target.rounds >= 1 && target.rounds <= MAX_ROUNDS;
}

/** A rhythm needs at least one inhale and one exhale, and every step in bounds. */
export function isValidRhythm(steps: readonly RhythmStep[], increment: Increment): boolean {
  return (
    steps.length >= 2 &&
    steps.some((s) => s.kind === 'inhale') &&
    steps.some((s) => s.kind === 'exhale') &&
    steps.every((s) => isValidSeconds(s.kind, s.seconds, increment))
  );
}

/** Moves one step by one increment, staying inside its bounds. */
export function nudgeSeconds(kind: StepKind, seconds: number, direction: 1 | -1, increment: Increment): number {
  const next = seconds + direction * increment;
  return Math.min(MAX_STEP_SECONDS, Math.max(minSeconds(kind), next));
}

export const stepMs = (step: RhythmStep): number => Math.round(step.seconds * 1000);

/** One pass through the steps. 0-second steps add nothing. */
export function roundMs(steps: readonly RhythmStep[]): number {
  return steps.reduce((sum, step) => sum + stepMs(step), 0);
}

export interface Plan {
  roundMs: number;
  rounds: number;
  durationMs: number;
  /** Inhale steps per minute. Always presented as guided, never measured. */
  breathsPerMinute: number;
}

/** Planned rounds round up, so the round that reaches a minutes target finishes. */
export function planFor(steps: readonly RhythmStep[], target: Target): Plan {
  const perRound = roundMs(steps);
  const rounds = 'rounds' in target ? target.rounds : Math.ceil((target.minutes * 60_000) / perRound);
  const breaths = steps.filter((s) => s.kind === 'inhale' && s.seconds > 0).length;
  return {
    roundMs: perRound,
    rounds,
    durationMs: rounds * perRound,
    breathsPerMinute: (breaths * 60_000) / perRound,
  };
}

/** One decimal place; whole numbers without a decimal (3.8, 6, 5.5). */
export function formatPace(breathsPerMinute: number): string {
  return String(Math.round(breathsPerMinute * 10) / 10);
}

export interface StepPosition {
  /** Complete rounds before this step. */
  round: number;
  /** Index into the original steps array (0-second steps are never returned). */
  index: number;
  /** Plan time where this step began. */
  startMs: number;
  durationMs: number;
  elapsedMs: number;
}

/**
 * The step playing at `elapsedMs` of plan time. 0-second steps are skipped.
 * Past the end of a round sequence the math keeps counting rounds; callers
 * clamp to the plan.
 */
export function stepAt(steps: readonly RhythmStep[], elapsedMs: number): StepPosition {
  const perRound = roundMs(steps);
  const clamped = Math.max(0, elapsedMs);
  const round = Math.floor(clamped / perRound);
  let within = clamped - round * perRound;
  let boundary = round * perRound;
  for (let index = 0; index < steps.length; index++) {
    const duration = stepMs(steps[index]);
    if (duration === 0) continue;
    if (within < duration) {
      return { round, index, startMs: boundary, durationMs: duration, elapsedMs: within };
    }
    within -= duration;
    boundary += duration;
  }
  // Unreachable while perRound > 0; keeps the function total.
  return { round, index: 0, startMs: boundary, durationMs: stepMs(steps[0]), elapsedMs: 0 };
}

/** Every non-zero step boundary in plan time, from `fromMs` up to `untilMs`. */
export function boundaries(
  steps: readonly RhythmStep[],
  fromMs: number,
  untilMs: number,
): { atMs: number; round: number; index: number }[] {
  const result: { atMs: number; round: number; index: number }[] = [];
  let position = stepAt(steps, fromMs);
  let atMs = position.startMs;
  let { round, index } = position;
  while (atMs < untilMs) {
    if (atMs >= fromMs) result.push({ atMs, round, index });
    atMs += stepMs(steps[index]);
    do {
      index = (index + 1) % steps.length;
      if (index === 0) round += 1;
    } while (stepMs(steps[index]) === 0);
  }
  return result;
}
