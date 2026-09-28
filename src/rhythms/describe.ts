import { describeRhythm, describeTarget } from '../breathing/describe';
import type { Practice } from '../practice/practice';
import { findTechnique } from '../sharing/link';
import type { SavedRhythm } from './repository';

/** “Nadi Shodhana · in 4 · out 6, each side · 5 min” */
export function rhythmSubtitle(rhythm: SavedRhythm): string {
  const base = rhythm.techniqueId ? findTechnique(rhythm.techniqueId)?.name : null;
  return [base, describeRhythm(rhythm.steps), describeTarget(rhythm.target)].filter(Boolean).join(' · ');
}

export function practiceFromRhythm(rhythm: SavedRhythm): Practice {
  return { source: { kind: 'rhythm', id: rhythm.id }, name: rhythm.name, techniqueId: rhythm.techniqueId, steps: rhythm.steps, target: rhythm.target };
}
