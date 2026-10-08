/**
 * Longer holds (research: pranayama users ask for retention past 20 s).
 * Kumbhaka beyond 20 seconds is retention-led practice, which the PRD
 * releases only after a named instructor review (FR-07 and the release
 * blockers). So the setting exists in development builds for that review,
 * and appears in release builds only once `review` is recorded here.
 *
 * Owner and instructor to review: every line below. Sources:
 * docs/content/technique-research.md (General Take care: BHF on holds with
 * heart or lung conditions; teacher sources against retention in
 * pregnancy; Nardi 2006 on breath holds and panic; CDC MMWR 2015 on holds
 * near water).
 */
import type { Review } from './types';

export const LONG_HOLDS = {
  contentVersion: 1,
  review: null as Review | null,
  lead: 'Holding the breath for longer, called kumbhaka, is part of traditional pranayama. It is usually learned slowly, with a teacher.',
  what: 'With this on, holds and rests in Adjust rhythm can run up to 60 seconds. Inhales and exhales stay at up to 20.',
  takeCare: [
    'Build up slowly: a second or two more at a time, over days and weeks.',
    'Never strain. Let each hold end before you feel an urge to gasp; the next breath should come calmly.',
    'Pregnant, or living with a heart or lung condition? Don’t use longer holds unless your clinician agrees.',
    'If holding your breath makes you anxious, shorten the hold or turn this off.',
    'Never practise breath holds in or near water, or while driving.',
  ],
  sharing: 'Rhythms with holds over 20 seconds stay on this device; they can’t be shared by link.',
} as const;

/** Release builds show the setting only after a recorded review of this content version. */
export function longHoldsOffered(dev: boolean = __DEV__): boolean {
  return dev || (LONG_HOLDS.review !== null && LONG_HOLDS.review.contentVersion === LONG_HOLDS.contentVersion);
}
