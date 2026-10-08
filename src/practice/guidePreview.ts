/**
 * Visual guide previews: one silent cycle of the current practice, drawn by
 * the style being previewed, then stop. Previews keep their own clock; they
 * never touch a session, which stays paused with its clock frozen.
 */
import { stepLabel } from '../breathing/describe';
import { STEP_KINDS, type RhythmStep } from '../breathing/rhythm';
import type { VisualGuide } from './visualGuide';

/** The practice a preview plays, as passed to the chooser: its name and steps. */
export interface PreviewPractice {
  name: string;
  steps: RhythmStep[];
}

/** Reads the chooser's `practice` parameter; null if it isn't a practice with time to play. */
export function parsePreviewPractice(raw: string | undefined): PreviewPractice | null {
  try {
    const value = raw ? JSON.parse(raw) : null;
    if (!value || typeof value.name !== 'string' || !Array.isArray(value.steps)) return null;
    const steps = value.steps as RhythmStep[];
    const valid = steps.every((s) => s && STEP_KINDS.includes(s.kind) && Number.isFinite(s.seconds) && s.seconds >= 0);
    return valid && cycleMs(steps) > 0 ? { name: value.name, steps } : null;
  } catch {
    return null;
  }
}

/** One cycle: the practice's steps that take time, in order. */
export const cycleSteps = (steps: readonly RhythmStep[]) => steps.filter((s) => s.seconds > 0);
export const cycleMs = (steps: readonly RhythmStep[]) => cycleSteps(steps).reduce((total, s) => total + s.seconds * 1000, 0);
const wholeSeconds = (ms: number) => Math.round(ms / 1000);

/** “20 sec · no sound”: the card's footer before a preview starts. */
export const previewLength = (steps: readonly RhythmStep[]) => `${wholeSeconds(cycleMs(steps))} sec · no sound`;

export interface PreviewFrame {
  step: RhythmStep;
  /** Which timed step, so the drawing re-syncs on each new one. */
  index: number;
  elapsedMs: number;
  durationMs: number;
  /** Through the whole cycle. */
  cycleElapsedMs: number;
  cycleMs: number;
}

/** Where the preview is, `ms` after it started; null once the cycle is over. */
export function previewFrame(steps: readonly RhythmStep[], ms: number): PreviewFrame | null {
  const timed = cycleSteps(steps);
  const total = cycleMs(steps);
  if (ms < 0 || ms >= total) return null;
  let start = 0;
  for (let index = 0; index < timed.length; index++) {
    const durationMs = timed[index].seconds * 1000;
    if (ms < start + durationMs) return { step: timed[index], index, elapsedMs: ms - start, durationMs, cycleElapsedMs: ms, cycleMs: total };
    start += durationMs;
  }
  return null;
}

/** “Inhale left · 12 of 20 sec”, while a preview plays. */
export const previewProgress = (frame: PreviewFrame) =>
  `${stepLabel(frame.step)} · ${Math.floor(frame.cycleElapsedMs / 1000)} of ${wholeSeconds(frame.cycleMs)} sec`;

/** At most one preview at a time. */
export type PreviewState = { guide: VisualGuide; startedAt: number } | null;
export type PreviewAction = { type: 'toggle'; guide: VisualGuide; at: number } | { type: 'stop' } | { type: 'tick'; at: number; cycleMs: number };

export function previewReducer(state: PreviewState, action: PreviewAction): PreviewState {
  switch (action.type) {
    // Preview on one style stops the other; on the one playing, it's Stop preview.
    case 'toggle':
      return state?.guide === action.guide ? null : { guide: action.guide, startedAt: action.at };
    case 'stop':
      return null;
    // One cycle, then it stops by itself.
    case 'tick':
      return state && action.at - state.startedAt >= action.cycleMs ? null : state;
  }
}
