/**
 * The watch companion (Apple Watch and Wear OS; research gap 4): what the
 * phone sends and what comes back. The watch runs a practice on its own
 * clock, wrist down, with haptics only, so practice works eyes closed with
 * the phone in a bag. It sends back one record per practice, which the phone
 * checks like any import and saves to History (and Health) as usual.
 *
 * Plain JSON, versioned; both watch apps parse exactly this shape.
 *   phone → watch  CompanionContext: a few practices and the haptic settings
 *   watch → phone  WatchSession: what happened, with the practice echoed back
 */
import { describeRhythm, describeTarget, stepLabel } from '../breathing/describe';
import { planFor, type RhythmStep, type Slowing, type StepKind } from '../breathing/rhythm';
import type { HapticPhases, HapticStyle } from '../haptics/patterns';
import type { SessionRecord } from '../history/repository';
import { parsePractice, practiceKey, type Practice } from '../practice/practice';
import type { Preferences } from '../settings/preferences';

export const COMPANION_VERSION = 1;
/** Breathe's ready practice first, then the box quick start and saved rhythms. */
export const MAX_WATCH_PRACTICES = 8;
/** Longer than any plan (60 minutes, or 108 slow rounds), with room for pauses. */
const MAX_ACTIVE_MS = 3 * 60 * 60_000;
/** Well past any real clock skew, so a bad clock can't land a practice in a strange year. */
const MAX_FUTURE_MS = 24 * 60 * 60_000;

export interface WatchStep {
  kind: StepKind;
  seconds: number;
  /** “Inhale left”, “Hum”, “Hold after inhale”: the phone's own label. */
  label: string;
}

export interface WatchPractice {
  /** Stable across sends (`practiceKey`), so the watch keeps its selection. */
  key: string;
  name: string;
  /** “4 · 4 · 4 · 4 · 5 min” */
  detail: string;
  steps: WatchStep[];
  /** Whole rounds, as planned on the phone (the round that reaches the target finishes). */
  rounds: number;
  durationMs: number;
  /** Gradual slowing: inhale and exhale move round by round to these lengths (src/breathing/rhythm.ts `slowedSteps`). */
  slowing: Slowing | null;
  /** The practice as JSON, echoed back verbatim so the phone can rebuild the record. */
  practiceJson: string;
}

export interface CompanionContext {
  v: typeof COMPANION_VERSION;
  practices: WatchPractice[];
  haptics: { style: HapticStyle; phases: HapticPhases };
  sentAt: number;
}

export interface WatchSession {
  v: typeof COMPANION_VERSION;
  /** A UUID made on the watch; saving is idempotent, so a resent session is kept once. */
  id: string;
  startedAt: number;
  activeMs: number;
  completedRounds: number;
  outcome: 'completed' | 'ended';
  practiceJson: string;
}

export function watchPractice(practice: Practice): WatchPractice {
  const plan = planFor(practice.steps, practice.target, practice.slowing ?? null);
  return {
    key: practiceKey(practice),
    name: practice.name,
    detail: `${describeRhythm(practice.steps)} · ${describeTarget(practice.target)}`,
    steps: practice.steps.map((s: RhythmStep) => ({ kind: s.kind, seconds: s.seconds, label: stepLabel(s) })),
    rounds: plan.rounds,
    durationMs: plan.durationMs,
    slowing: practice.slowing ?? null,
    practiceJson: JSON.stringify(practice),
  };
}

/** Distinct practices in order, at most MAX_WATCH_PRACTICES. */
export function companionContext(practices: readonly Practice[], preferences: Pick<Preferences, 'hapticStyle' | 'hapticPhases'>, now: number): CompanionContext {
  const seen = new Set<string>();
  const chosen: WatchPractice[] = [];
  for (const practice of practices) {
    const key = practiceKey(practice);
    // Custom rhythms share one key, so only the first (the ready one) goes.
    if (seen.has(key)) continue;
    seen.add(key);
    chosen.push(watchPractice(practice));
    if (chosen.length === MAX_WATCH_PRACTICES) break;
  }
  return { v: COMPANION_VERSION, practices: chosen, haptics: { style: preferences.hapticStyle, phases: preferences.hapticPhases }, sentAt: now };
}

/**
 * A record from what the watch sent, or null if anything is off. The
 * practice must pass the same checks as a share link or an import, so a
 * watch can never add a rhythm the phone wouldn't accept.
 */
export function recordFromWatch(value: unknown, now: number): SessionRecord | null {
  if (typeof value !== 'object' || value === null) return null;
  const s = value as Partial<WatchSession>;
  if (s.v !== COMPANION_VERSION || typeof s.id !== 'string' || !/^[0-9A-Fa-f-]{36}$/.test(s.id)) return null;
  if (!Number.isInteger(s.startedAt) || s.startedAt! <= 0 || s.startedAt! > now + MAX_FUTURE_MS) return null;
  if (!Number.isInteger(s.activeMs) || s.activeMs! <= 0 || s.activeMs! > MAX_ACTIVE_MS) return null;
  if (!Number.isInteger(s.completedRounds) || s.completedRounds! < 0) return null;
  if (s.outcome !== 'completed' && s.outcome !== 'ended') return null;
  let practice: Practice | null = null;
  try {
    practice = typeof s.practiceJson === 'string' ? parsePractice(JSON.parse(s.practiceJson)) : null;
  } catch {
    return null;
  }
  if (!practice) return null;
  const plan = planFor(practice.steps, practice.target, practice.slowing ?? null);
  if (s.completedRounds! > plan.rounds) return null;
  return {
    id: s.id.toLowerCase(),
    startedAt: s.startedAt!,
    activeMs: s.activeMs!,
    source: practice.source,
    techniqueId: practice.techniqueId,
    name: practice.name,
    steps: practice.steps,
    target: practice.target,
    completedRounds: s.completedRounds!,
    breathsPerMinute: plan.breathsPerMinute,
    slowing: practice.slowing ?? null,
    outcome: s.outcome,
    // The watch guides by touch alone.
    cueMode: 'silent',
    haptics: true,
    parts: null,
    program: null,
    health: 'none',
  };
}
