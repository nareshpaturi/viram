/**
 * The one short caution shown before a practice starts, on Breathe and while
 * settling, so every way in (first use, quick start, saved rhythm, program,
 * routine) carries it (content review F10). It follows the rhythm being
 * practised, not only the library entry: holds added to a hold-free practice
 * get the hold caution.
 */
import { COMFORT_LINE } from '../content/safety';
import { techniqueOf, type Practice } from './practice';

export const HOLD_CAUTION = 'Keep the holds easy. If one feels tight, shorten it or set it to Off. Never hold your breath in or near water.';

const holds = (steps: Practice['steps']) => steps.some((s) => (s.kind === 'hold' || s.kind === 'rest') && s.seconds > 0);

export function cautionFor(practice: Pick<Practice, 'techniqueId' | 'steps'>): string {
  const technique = techniqueOf(practice);
  if (holds(practice.steps) && !(technique && holds(technique.practice.steps))) return HOLD_CAUTION;
  return technique ? technique.guidance.takeCareShort : COMFORT_LINE;
}
