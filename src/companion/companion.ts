/**
 * The watch companion (Apple Watch and Wear OS; research gap 4): what the
 * phone sends and what comes back. The watch runs a practice on its own
 * clock, wrist down, with haptics only, so practice works eyes closed with
 * the phone in a bag. It sends back one record per practice, which the phone
 * checks like any import and saves to History (and Health) as usual.
 *
 * Plain JSON, versioned; both watch apps parse exactly this shape.
 *   phone → watch  CompanionContext: the practices and the haptic settings
 *   watch → phone  WatchSession: what happened, with the practice echoed back
 */
import { describeRhythm, describeTarget, stepLabel } from '../breathing/describe';
import { planFor, type Plan, type RhythmStep, type Slowing, type StepKind } from '../breathing/rhythm';
import type { HapticPhases, HapticStyle } from '../haptics/patterns';
import type { ProgramTag, SessionRecord } from '../history/repository';
import { cautionFor } from '../practice/caution';
import { parsePractice, practiceKey, type Practice } from '../practice/practice';
import type { Preferences } from '../settings/preferences';

export const COMPANION_VERSION = 1;
/**
 * Breathe's practice, box breathing, the most recent of My rhythms, and the
 * whole library: well under the size WatchConnectivity and the Data Layer take.
 */
export const MAX_WATCH_PRACTICES = 32;
/** Longer than any plan (60 minutes, or 108 slow rounds), with room for pauses. */
const MAX_ACTIVE_MS = 3 * 60 * 60_000;
/** Well past any real clock skew, so a bad clock can't land a practice in a strange year. */
const MAX_FUTURE_MS = 24 * 60 * 60_000;
/** Rounding between the watch's plan and the phone's, with room to spare. */
const PLAN_SLACK_MS = 1000;

export interface WatchStep {
  kind: StepKind;
  seconds: number;
  /** “Inhale left”, “Hum”, “Hold after inhale”: the phone's own label. */
  label: string;
}

export interface WatchPractice {
  /** Unique in a context and stable across sends: where it comes from and its rhythm. */
  key: string;
  name: string;
  /** “4 · 4 · 4 · 4 · 5 min”, or “Session 3 · 4 · 4 · 4 · 4 · 3 min” in a program */
  detail: string;
  steps: WatchStep[];
  /** Whole rounds, as planned on the phone (the round that reaches the target finishes). */
  rounds: number;
  durationMs: number;
  /** Gradual slowing: inhale and exhale move round by round to these lengths (src/breathing/rhythm.ts `slowedSteps`). */
  slowing: Slowing | null;
  /**
   * The phone's one short caution for this practice (src/practice/caution.ts),
   * so the watch carries it too (content review F10). Contexts sent before it
   * existed lack it; both watch apps read it as optional.
   */
  caution: string;
  /**
   * The practice as JSON, echoed back verbatim so the phone can rebuild the
   * record; a program session also carries its `program` tag here, so the
   * watch apps needn't know about programs.
   */
  practiceJson: string;
}

/** A practice for the watch, and the program session it is, if any. */
export interface WatchOffer {
  practice: Practice;
  program?: ProgramTag;
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

/** Where a practice comes from and exactly what it runs, so equal practices share it and different ones don't. */
function watchKey({ practice, program }: WatchOffer): string {
  const steps = practice.steps.map((s) => `${s.kind}${s.seconds}${s.cue ? `:${s.cue}` : ''}`).join(',');
  const target = 'rounds' in practice.target ? `r${practice.target.rounds}` : `m${practice.target.minutes}`;
  const slowing = practice.slowing ? ` s${practice.slowing.inhale}/${practice.slowing.exhale}` : '';
  const from = program ? `program:${program.id}:${program.session}` : practiceKey(practice);
  return `${from} ${steps} ${target}${slowing}`;
}

export function watchPractice(offer: WatchOffer): WatchPractice {
  const { practice, program } = offer;
  const plan = planFor(practice.steps, practice.target, practice.slowing ?? null);
  return {
    key: watchKey(offer),
    name: practice.name,
    detail: `${program ? `Session ${program.session} · ` : ''}${describeRhythm(practice.steps)} · ${describeTarget(practice.target)}`,
    steps: practice.steps.map((s: RhythmStep) => ({ kind: s.kind, seconds: s.seconds, label: stepLabel(s) })),
    rounds: plan.rounds,
    durationMs: plan.durationMs,
    slowing: practice.slowing ?? null,
    caution: cautionFor(practice),
    practiceJson: JSON.stringify(program ? { ...practice, program } : practice),
  };
}

/**
 * Distinct practices in order, at most MAX_WATCH_PRACTICES. Only an exact
 * repeat is dropped: an adjusted Sama Vritti and 5-minute box breathing are
 * both offered (QA W05).
 */
export function companionContext(offers: readonly WatchOffer[], preferences: Pick<Preferences, 'hapticStyle' | 'hapticPhases'>, now: number): CompanionContext {
  const seen = new Set<string>();
  const chosen: WatchPractice[] = [];
  for (const offer of offers) {
    const key = watchKey(offer);
    if (seen.has(key)) continue;
    seen.add(key);
    chosen.push(watchPractice(offer));
    if (chosen.length === MAX_WATCH_PRACTICES) break;
  }
  return { v: COMPANION_VERSION, practices: chosen, haptics: { style: preferences.hapticStyle, phases: preferences.hapticPhases }, sentAt: now };
}

/** Where `rounds` whole rounds end. */
function roundsEndMs(plan: Plan, rounds: number): number {
  return plan.roundStartsMs ? plan.roundStartsMs[rounds] : rounds * plan.roundMs;
}

function programTagOf(value: unknown): ProgramTag | null {
  if (typeof value !== 'object' || value === null) return null;
  const p = value as Partial<ProgramTag>;
  return typeof p.id === 'string' && typeof p.name === 'string' && Number.isInteger(p.session) && p.session! >= 1
    ? { id: p.id, name: p.name, session: p.session! }
    : null;
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
  let echoed: unknown;
  try {
    echoed = typeof s.practiceJson === 'string' ? JSON.parse(s.practiceJson) : null;
  } catch {
    return null;
  }
  const practice = parsePractice(echoed);
  if (!practice) return null;
  const plan = planFor(practice.steps, practice.target, practice.slowing ?? null);
  // The parts must agree (QA W09). Pausing repeats a step and never skips one,
  // so active time is at least the plan time reached: all of it when completed.
  if (s.outcome === 'completed') {
    if (s.completedRounds !== plan.rounds || s.activeMs! + PLAN_SLACK_MS < plan.durationMs) return null;
  } else if (s.completedRounds! >= plan.rounds || s.activeMs! + PLAN_SLACK_MS < roundsEndMs(plan, s.completedRounds!)) {
    return null;
  }
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
    // Checked against the phone's own program before it's kept (saveWatchSessions).
    program: programTagOf((echoed as { program?: unknown }).program),
    health: 'none',
  };
}
