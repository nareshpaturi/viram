/**
 * The visual guide: how practice shows the breath. A person chooses it in
 * the Visual guide screen, from Guidance or while paused, and it applies to
 * every practice. It only changes what's drawn; the session, its clock, and
 * its cues never read it.
 *
 * Breath circle (the default) is the lit guide, with a small nose drawing
 * above it on side and hum steps. Illustrated guide draws the nose instead,
 * with the air moving on the session clock; practices that breathe through
 * the mouth or chant keep the circle.
 */
import type { RhythmStep } from '../breathing/rhythm';

export type VisualGuide = 'circle' | 'illustrated';
export const VISUAL_GUIDES: readonly VisualGuide[] = ['circle', 'illustrated'];

/** A stored value, read safely: anything but 'illustrated' is the breath circle. */
export const visualGuideOf = (value: unknown): VisualGuide => (value === 'illustrated' ? 'illustrated' : 'circle');

export const VISUAL_GUIDE_NAME: Record<VisualGuide, string> = { circle: 'Breath circle', illustrated: 'Illustrated guide' };
export const VISUAL_GUIDE_DESCRIPTION: Record<VisualGuide, string> = {
  circle: 'A gentle rhythm, with small side and hum cues.',
  illustrated: 'Follow the airflow, nostril side and hum.',
};
export const VISUAL_GUIDE_USE: Record<VisualGuide, string> = { circle: 'Use breath circle', illustrated: 'Use illustrated guide' };

/** The illustrated guide draws air through the nose, so mouth breathing and chanting (Sheetali, Om) keep the circle. */
export function breathesThroughNose(steps: readonly RhythmStep[]): boolean {
  return steps.every((s) => s.route !== 'mouth' && s.cue !== 'om');
}

/** Why the illustrated guide shows the circle for this practice, if it does. */
export function keepsCircleNote(name: string, steps: readonly RhythmStep[]): string | null {
  if (breathesThroughNose(steps)) return null;
  return steps.some((s) => s.route === 'mouth')
    ? `${name} breathes through the mouth, so it keeps the breath circle.`
    : `${name} chants Om, so it keeps the breath circle.`;
}

/** What practice draws for this practice: the illustration, or the circle. */
export function drawsIllustration(guide: VisualGuide, steps: readonly RhythmStep[]): boolean {
  return guide === 'illustrated' && breathesThroughNose(steps);
}

/** Above the breath circle, only where the circle alone can't show it: which side is open, or a closed-lip hum. */
export function drawsAboveCircle(step: RhythmStep): boolean {
  return !!step.side || step.cue === 'hum';
}

/** The line under the circle's drawing: “Left open · Right closed”, or “Lips closed, humming”. */
export function drawingLabel(step: RhythmStep): string | null {
  if (step.cue === 'hum') return 'Lips closed, humming';
  if (!step.side) return null;
  return step.side === 'left' ? 'Left open · Right closed' : 'Right open · Left closed';
}

/** Under the practice's name: side practices explain the mirror view. */
export function practiceNote(steps: readonly RhythmStep[], subtitle: string | null): string | null {
  return steps.some((s) => s.side) ? 'Mirror view: your left is on the left' : subtitle;
}
