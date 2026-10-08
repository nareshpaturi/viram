/**
 * Gentle progression (FR-15). After 5 completed sessions at one rhythm
 * within 14 days, the completion screen offers the next rhythm on that
 * technique's path. Nothing changes unless the practitioner accepts, and
 * “Make it easier next time” is offered after every single practice.
 */
import { MINUTE_SHORTCUTS, type RhythmStep, type Target } from '../breathing/rhythm';
import type { SessionRecord } from '../history/repository';
import { parsePractice, practiceFromTechnique, techniqueOf, type Practice } from '../practice/practice';
import { validateRhythm } from '../sharing/link';

export const SESSIONS_FOR_OFFER = 5;
export const OFFER_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

export interface ProgressionPreferences {
  progressionStopped: readonly string[];
  progressionSnoozed: Readonly<Record<string, number>>;
}

export interface Offer {
  techniqueId: string;
  /** The rhythm practiced, as recorded. */
  current: Practice;
  /** The next step on the path, with the same target. */
  next: Practice;
  /** Qualifying sessions, including this one. */
  count: number;
  prompt: string;
}

const secondsOf = (steps: readonly RhythmStep[]) => steps.map((s) => s.seconds);
const sameSeconds = (a: readonly number[], b: readonly number[]) => a.length === b.length && a.every((x, i) => x === b[i]);

/** The technique's default rhythm followed by its progression path, or null. */
function pathOf(practice: Practice): number[][] | null {
  const technique = techniqueOf(practice);
  const progression = technique?.practice.progression;
  return technique && progression ? [secondsOf(technique.practice.steps), ...progression.steps] : null;
}

/** A single practice from a record; routines and program sessions have none here. */
function singlePractice(record: SessionRecord): Practice | null {
  if (record.parts || record.source.kind === 'routine' || record.program) return null;
  return parsePractice({ source: record.source, name: record.name, techniqueId: record.techniqueId, steps: record.steps, target: record.target });
}

/** The library technique at the given seconds and target, checked like a link. */
function libraryPractice(from: Practice, seconds: readonly number[], target: Target): Practice | null {
  const technique = techniqueOf(from);
  if (!technique) return null;
  const base = practiceFromTechnique(technique);
  const steps = base.steps.map((step, i) => ({ ...step, seconds: seconds[i] }));
  const checked = validateRhythm({ name: base.name, steps, target, techniqueId: technique.id });
  return checked ? { ...base, steps, target: checked.target } : null;
}

/**
 * The offer to show after `record` was saved, or null. `history` holds the
 * saved records; only completed single practices of the same technique at
 * the same rhythm in the last 14 days count, and after “Not now” only those
 * that came later.
 */
export function progressionOffer(
  record: SessionRecord,
  history: readonly SessionRecord[],
  preferences: ProgressionPreferences,
  now: number,
): Offer | null {
  if (record.outcome !== 'completed') return null;
  const current = singlePractice(record);
  const techniqueId = current?.techniqueId;
  if (!current || !techniqueId || preferences.progressionStopped.includes(techniqueId)) return null;
  const path = pathOf(current);
  if (!path) return null;
  const seconds = secondsOf(current.steps);
  const at = path.findIndex((step) => sameSeconds(step, seconds));
  if (at < 0 || at === path.length - 1) return null;

  const since = Math.max(now - OFFER_WINDOW_MS, (preferences.progressionSnoozed[techniqueId] ?? -Infinity) + 1);
  const count = history.filter(
    (r) =>
      r.startedAt >= since &&
      r.startedAt <= now &&
      r.outcome === 'completed' &&
      !r.parts &&
      !r.program &&
      r.techniqueId === techniqueId &&
      sameSeconds(secondsOf(r.steps), seconds),
  ).length;
  if (count < SESSIONS_FOR_OFFER) return null;

  const next = libraryPractice(current, path[at + 1], current.target);
  const prompt = techniqueOf(current)?.practice.progression?.prompt;
  return next && prompt ? { techniqueId, current, next, count, prompt } : null;
}

/**
 * “Make it easier next time”: one step back on the technique's path when
 * the practice is past its default, otherwise a shorter session. Null when
 * there is nothing gentler (1 minute or 1 round at the start of a path).
 */
export function easierPractice(record: SessionRecord): Practice | null {
  const current = singlePractice(record);
  if (!current) return null;
  const path = pathOf(current);
  const at = path ? path.findIndex((step) => sameSeconds(step, secondsOf(current.steps))) : -1;
  if (path && at > 0) return libraryPractice(current, path[at - 1], current.target);

  const target = shorterTarget(current.target);
  return target ? { ...current, target } : null;
}

/** The next shorter minute shortcut (or 1 minute), or about a quarter fewer rounds. */
function shorterTarget(target: Target): Target | null {
  if ('minutes' in target) {
    const shorter = [1, ...MINUTE_SHORTCUTS].filter((m) => m < target.minutes);
    return shorter.length ? { minutes: shorter[shorter.length - 1] } : null;
  }
  if (target.rounds <= 1) return null;
  return { rounds: target.rounds - Math.max(1, Math.round(target.rounds / 4)) };
}
