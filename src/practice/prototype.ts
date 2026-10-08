/**
 * The practice-screen prototype for the moderated test (batch 3, development
 * builds only). B keeps the guide and draws the nose above it on side and
 * hum steps; A draws the nose instead of the guide, with the air moving on
 * the session clock. Release builds always show the current screen.
 */
import type { RhythmStep } from '../breathing/rhythm';

export type PracticeScreen = 'current' | 'a' | 'b';

/** The screen to show: the developer setting, honored only in development builds. */
export function practiceVariant(setting: PracticeScreen | undefined, dev: boolean = __DEV__): PracticeScreen {
  return dev && (setting === 'a' || setting === 'b') ? setting : 'current';
}

/** A draws air through the nose, so mouth breathing and chanting (Sheetali, Om) keep the guide. */
export function breathesThroughNose(steps: readonly RhythmStep[]): boolean {
  return steps.every((s) => s.route !== 'mouth' && s.cue !== 'om');
}

/** B draws only where the guide alone can't show it: which side is open, or a closed-lip hum. */
export function drawsInB(step: RhythmStep): boolean {
  return !!step.side || step.cue === 'hum';
}

/** The line under B's drawing: “Left open · Right closed”, or “Lips closed, humming”. */
export function drawingLabel(step: RhythmStep): string | null {
  if (step.cue === 'hum') return 'Lips closed, humming';
  if (!step.side) return null;
  return step.side === 'left' ? 'Left open · Right closed' : 'Right open · Left closed';
}

/** Under the practice's name on A and B: side practices explain the mirror view. */
export function practiceNote(steps: readonly RhythmStep[], subtitle: string | null): string | null {
  return steps.some((s) => s.side) ? 'Mirror view: your left is on the left' : subtitle;
}
