/**
 * Voice cue inventory and the rule that picks each step's cue. Clips are
 * generated once from these scripts and bundled (docs/content/technique-research.md#voice).
 */
import type { RhythmStep } from '../breathing/rhythm';

/** maxSeconds is checked against each generated clip's measured length. */
export const CUES = {
  inhale: { text: 'Inhale', maxSeconds: 0.8 },
  hold: { text: 'Hold', maxSeconds: 0.8 },
  exhale: { text: 'Exhale', maxSeconds: 0.8 },
  rest: { text: 'Rest', maxSeconds: 0.8 },
  hum: { text: 'Hum', maxSeconds: 0.8 },
  // Side phrases are recorded whole so they sound like one calm instruction.
  'inhale-left': { text: 'Inhale left', maxSeconds: 1.2 },
  'inhale-right': { text: 'Inhale right', maxSeconds: 1.2 },
  'exhale-left': { text: 'Exhale left', maxSeconds: 1.2 },
  'exhale-right': { text: 'Exhale right', maxSeconds: 1.2 },
  'inhale-mouth': { text: 'In through the mouth', maxSeconds: 1.6 },
  'exhale-mouth': { text: 'Out through the mouth', maxSeconds: 1.6 },
} as const;

export type CueId = keyof typeof CUES;

/**
 * A step speaks its kind word (or Hum) with its side. A mouth step names its
 * route on the first round only; later rounds use the plain word.
 */
export function cueFor(step: RhythmStep, round: number): CueId {
  if (step.cue) return step.cue;
  if (step.kind === 'inhale' || step.kind === 'exhale') {
    if (step.side) return `${step.kind}-${step.side}`;
    if (step.route === 'mouth' && round === 1) return `${step.kind}-mouth`;
  }
  return step.kind;
}
