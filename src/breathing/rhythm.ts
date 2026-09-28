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

/** The minute choices in Adjust rhythm and share links (FR-01). */
export type MinuteTarget = 1 | 3 | 5 | 10;
/** Routines and programs set any whole number of minutes per practice (FR-14, FR-20). */
export type Target = { minutes: number } | { rounds: number };
export type Increment = 1 | 0.5;

export const STEP_KINDS: readonly StepKind[] = ['inhale', 'hold', 'exhale', 'rest'];
export const MINUTE_TARGETS: readonly MinuteTarget[] = [1, 3, 5, 10];
export const ROUND_SHORTCUTS = [11, 21, 27] as const;
export const MAX_ROUNDS = 108;
export const MAX_STEP_SECONDS = 20;
/** Longest single practice inside a routine or program. */
export const MAX_SEGMENT_MINUTES = 30;

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

/**
 * Adjust rhythm and share links offer 1, 3, 5, or 10 minutes; routine and
 * program parts may use any whole number of minutes up to 30.
 */
export function isValidTarget(target: Target, anyMinutes = false): boolean {
  if ('minutes' in target) {
    return anyMinutes
      ? Number.isInteger(target.minutes) && target.minutes >= 1 && target.minutes <= MAX_SEGMENT_MINUTES
      : MINUTE_TARGETS.includes(target.minutes as MinuteTarget);
  }
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

/**
 * Gradual slowing (FR-24): the inhale and exhale move evenly, round by
 * round, from the rhythm's own lengths to these, in tenths of a second.
 * Holds and rests are unchanged.
 */
export interface Slowing {
  inhale: number;
  exhale: number;
}

export interface Plan {
  /** The first round's length. */
  roundMs: number;
  rounds: number;
  durationMs: number;
  /** Inhale steps per minute at the start. Always presented as guided, never measured. */
  breathsPerMinute: number;
  /** The same in the last round; differs only with gradual slowing. */
  endBreathsPerMinute: number;
  /** With gradual slowing, where each round starts, then the end; null when every round is equal. */
  roundStartsMs: number[] | null;
}

const tenths = (seconds: number) => Math.round(seconds * 10) / 10;

/** Round `round`'s steps (0-based) when slowing across `rounds` rounds. */
export function slowedSteps(steps: readonly RhythmStep[], slowing: Slowing, round: number, rounds: number): RhythmStep[] {
  const f = rounds > 1 ? Math.min(1, round / (rounds - 1)) : 0;
  return steps.map((step) => {
    const end = step.kind === 'inhale' ? slowing.inhale : step.kind === 'exhale' ? slowing.exhale : null;
    return end === null ? step : { ...step, seconds: tenths(step.seconds + (end - step.seconds) * f) };
  });
}

function slowedStarts(steps: readonly RhythmStep[], slowing: Slowing, rounds: number): number[] {
  const starts = [0];
  for (let r = 0; r < rounds; r++) starts.push(starts[r] + roundMs(slowedSteps(steps, slowing, r, rounds)));
  return starts;
}

/**
 * Planned rounds round up, so the round that reaches a minutes target
 * finishes. With slowing, the fewest rounds whose slowed total reaches it.
 */
export function planFor(steps: readonly RhythmStep[], target: Target, slowing: Slowing | null = null): Plan {
  const perRound = roundMs(steps);
  const breaths = steps.filter((s) => s.kind === 'inhale' && s.seconds > 0).length;
  const pace = (ms: number) => (breaths * 60_000) / ms;
  if (!slowing) {
    const rounds = 'rounds' in target ? target.rounds : Math.ceil((target.minutes * 60_000) / perRound);
    const bpm = pace(perRound);
    return { roundMs: perRound, rounds, durationMs: rounds * perRound, breathsPerMinute: bpm, endBreathsPerMinute: bpm, roundStartsMs: null };
  }
  let rounds: number;
  let starts: number[];
  if ('rounds' in target) {
    rounds = target.rounds;
    starts = slowedStarts(steps, slowing, rounds);
  } else {
    // Every round is at most as long as the slowest, so this starts at or below the answer.
    const goal = target.minutes * 60_000;
    const slowest = roundMs(slowedSteps(steps, slowing, 1, 2));
    rounds = Math.max(1, Math.floor(goal / slowest));
    starts = slowedStarts(steps, slowing, rounds);
    while (starts[rounds] < goal) starts = slowedStarts(steps, slowing, ++rounds);
  }
  return {
    roundMs: starts[1],
    rounds,
    durationMs: starts[rounds],
    breathsPerMinute: pace(starts[1]),
    endBreathsPerMinute: pace(starts[rounds] - starts[rounds - 1]),
    roundStartsMs: starts,
  };
}

/** Slowing is offered for coherent breathing and custom rhythms (FR-24). */
export const SLOWING_TECHNIQUES: readonly (string | null)[] = [null, 'coherent'];

/**
 * A slowing that fits: one inhale and one exhale to move, each ending
 * within bounds, no shorter than it starts, and at least one longer.
 */
export function isValidSlowing(steps: readonly RhythmStep[], slowing: unknown): slowing is Slowing {
  if (typeof slowing !== 'object' || slowing === null) return false;
  const s = slowing as Slowing;
  const inhale = steps.filter((x) => x.kind === 'inhale');
  const exhale = steps.filter((x) => x.kind === 'exhale');
  if (inhale.length !== 1 || exhale.length !== 1) return false;
  const fits = (end: unknown, start: number) =>
    typeof end === 'number' && Number.isFinite(end) && tenths(end) === end && end >= start && end >= 1 && end <= MAX_STEP_SECONDS;
  return fits(s.inhale, inhale[0].seconds) && fits(s.exhale, exhale[0].seconds) && (s.inhale > inhale[0].seconds || s.exhale > exhale[0].seconds);
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

/** A plan with the steps it runs, and its slowing when it has one. */
export interface StepPlan extends Plan {
  steps: readonly RhythmStep[];
  slowing?: Slowing | null;
}

/** The steps of one round of a plan (0-based). */
export function roundSteps(plan: StepPlan, round: number): readonly RhythmStep[] {
  return plan.slowing && plan.roundStartsMs ? slowedSteps(plan.steps, plan.slowing, round, plan.rounds) : plan.steps;
}

/** `stepAt` for a plan, including rounds that lengthen with gradual slowing. */
export function planStepAt(plan: StepPlan, elapsedMs: number): StepPosition {
  const starts = plan.roundStartsMs;
  if (!starts) return stepAt(plan.steps, elapsedMs);
  const clamped = Math.max(0, elapsedMs);
  // The last round that starts at or before this moment.
  let lo = 0;
  let hi = plan.rounds - 1;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (starts[mid] <= clamped) lo = mid;
    else hi = mid - 1;
  }
  const within = stepAt(roundSteps(plan, lo), Math.min(clamped - starts[lo], starts[lo + 1] - starts[lo] - 1));
  return { ...within, round: lo, startMs: starts[lo] + within.startMs };
}

/** `boundaries` for a plan, with each step as it plays in its round. */
export function planBoundaries(
  plan: StepPlan,
  fromMs: number,
  untilMs: number,
): { atMs: number; round: number; index: number; step: RhythmStep }[] {
  const starts = plan.roundStartsMs;
  if (!starts) return boundaries(plan.steps, fromMs, untilMs).map((b) => ({ ...b, step: plan.steps[b.index] }));
  const result: { atMs: number; round: number; index: number; step: RhythmStep }[] = [];
  for (let round = planStepAt(plan, fromMs).round; round < plan.rounds && starts[round] < untilMs; round++) {
    const steps = roundSteps(plan, round);
    let atMs = starts[round];
    steps.forEach((step, index) => {
      if (stepMs(step) === 0) return;
      if (atMs >= fromMs && atMs < untilMs) result.push({ atMs, round, index, step });
      atMs += stepMs(step);
    });
  }
  return result;
}

/** A stored or received slowing: null when there is none, false when it doesn't fit. */
export function checkSlowing(techniqueId: string | null, steps: readonly RhythmStep[], value: unknown): Slowing | null | false {
  if (value === undefined || value === null) return null;
  if (!SLOWING_TECHNIQUES.includes(techniqueId) || !isValidSlowing(steps, value)) return false;
  return { inhale: value.inhale, exhale: value.exhale };
}
