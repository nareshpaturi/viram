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
  // v1.1 counting within steps (FR-19): each number fits a one-second slot.
  'count-2': { text: 'Two', maxSeconds: 0.8 },
  'count-3': { text: 'Three', maxSeconds: 0.8 },
  'count-4': { text: 'Four', maxSeconds: 0.8 },
  'count-5': { text: 'Five', maxSeconds: 0.8 },
  'count-6': { text: 'Six', maxSeconds: 0.8 },
  'count-7': { text: 'Seven', maxSeconds: 0.8 },
  'count-8': { text: 'Eight', maxSeconds: 0.8 },
  'count-9': { text: 'Nine', maxSeconds: 0.8 },
  'count-10': { text: 'Ten', maxSeconds: 0.8 },
  'count-11': { text: 'Eleven', maxSeconds: 0.8 },
  'count-12': { text: 'Twelve', maxSeconds: 0.8 },
  'count-13': { text: 'Thirteen', maxSeconds: 0.8 },
  'count-14': { text: 'Fourteen', maxSeconds: 0.8 },
  'count-15': { text: 'Fifteen', maxSeconds: 0.8 },
  'count-16': { text: 'Sixteen', maxSeconds: 0.8 },
  'count-17': { text: 'Seventeen', maxSeconds: 0.8 },
  'count-18': { text: 'Eighteen', maxSeconds: 0.8 },
  'count-19': { text: 'Nineteen', maxSeconds: 0.8 },
  'count-20': { text: 'Twenty', maxSeconds: 0.8 },
} as const;

export type CueId = keyof typeof CUES;

/** The spoken count for second `n` of a step (2–20); the step cue speaks the first. */
export const countCue = (n: number): CueId | null => (n >= 2 && n <= 20 ? (`count-${n}` as CueId) : null);

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
