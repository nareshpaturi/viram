/**
 * A practice taught as a set number of rounds (4-7-8: four to start, at most
 * eight) keeps that rule wherever it runs: Adjust rhythm, routines, saved
 * rhythms, links, and imports. Longer sessions belong to a custom rhythm,
 * not to the named practice.
 */
import type { Target } from '../breathing/rhythm';
import type { Technique } from './types';

export function techniqueTarget(technique: Pick<Technique, 'practice'> | undefined, target: Target): Target {
  const max = technique?.practice.maxRounds;
  if (!technique || !max) return target;
  if ('rounds' in target) return { rounds: Math.min(max, Math.max(1, target.rounds)) };
  return technique.practice.target;
}
