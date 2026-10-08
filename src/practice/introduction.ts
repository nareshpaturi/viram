/**
 * What a practice teaches before it starts (FR-19, and the content review of
 * 2026-10-08, F3 and F9). The voice never describes a rhythm other than the
 * one it's about to guide, and a routine never moves into a practice it
 * hasn't shown how to do.
 */
import type { RhythmStep } from '../breathing/rhythm';
import type { Technique } from '../content/types';
import type { Preferences } from '../settings/preferences';
import { techniqueOf, type Practice } from './practice';

type IntroPreferences = Pick<Preferences, 'introductions' | 'introductionsHeard' | 'introLength'>;

const sameSteps = (a: readonly RhythmStep[], b: readonly RhythmStep[]) =>
  a.length === b.length && a.every((step, i) => step.kind === b[i].kind && step.seconds === b[i].seconds);

/** True when a practice runs its technique's own rhythm, unchanged by Adjust rhythm or gradual slowing. */
export function runsLibraryRhythm(technique: Technique, practice: Pick<Practice, 'steps' | 'slowing'>): boolean {
  return !practice.slowing && sameSteps(practice.steps, technique.practice.steps);
}

/**
 * The introduction to play, or null. An adjusted rhythm hears only an
 * introduction that names no counts or holds (`fitsAdjusted`): the short one
 * if the long one names them, and none if neither fits.
 */
export function chooseIntroduction(
  technique: Technique | undefined,
  practice: Pick<Practice, 'steps' | 'slowing'>,
  preferences: IntroPreferences,
  quickStart: boolean,
): 'short' | 'long' | null {
  if (!technique || quickStart) return null;
  const wanted =
    preferences.introductions === 'always' || (preferences.introductions === 'first' && !preferences.introductionsHeard.includes(technique.id));
  if (!wanted) return null;
  const { introduction } = technique.guidance;
  const preferLong = preferences.introLength === 'long' && !!introduction.long;
  if (runsLibraryRhythm(technique, practice)) return preferLong ? 'long' : 'short';
  if (preferLong && introduction.long?.fitsAdjusted) return 'long';
  return introduction.fitsAdjusted ? 'short' : null;
}

/**
 * The later practices in a routine to stop before, showing how each is
 * done: those not taught yet in this run, and new to the person (or every
 * time, if they asked for introductions always).
 */
export function partsToPrepare(parts: readonly Pick<Practice, 'techniqueId'>[], preferences: IntroPreferences): number[] {
  if (preferences.introductions === 'never') return [];
  const indices: number[] = [];
  parts.forEach((part, index) => {
    const technique = techniqueOf(part);
    if (index === 0 || !technique) return;
    const earlier = parts.slice(0, index).some((p) => p.techniqueId === technique.id);
    const isNew = preferences.introductions === 'always' || !preferences.introductionsHeard.includes(technique.id);
    if (!earlier && isNew) indices.push(index);
  });
  return indices;
}
