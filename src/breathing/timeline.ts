/**
 * Builds the cue schedule the native audio timeline plays for one segment
 * (FR-02, FR-03). Times are segment clock times: the neutral lead comes
 * first, then one cue per non-zero step boundary, then the completion cue.
 */
import { cueFor, type CueId } from '../content/voice';
import { LEAD_MS, type SessionPlan } from './session';
import { formatClock } from './describe';
import { boundaries, stepMs, type StepKind } from './rhythm';

export type CueMode = 'voice' | 'tones' | 'silent';
export type ToneSet = 'soft-bells' | 'wood' | 'chimes';
export type HapticStrength = 'light' | 'medium' | 'strong';

export interface CueSettings {
  mode: CueMode;
  toneSet: ToneSet;
  haptics: HapticStrength | null;
}

export type SoundId = `tone.${ToneSet}.${StepKind | 'complete'}` | `voice.${CueId}`;

export interface Cue {
  atMs: number;
  sound: SoundId | null;
  haptic: HapticStrength | null;
  /** Lock-screen line from this cue on; set at each round start. */
  nowPlaying: string | null;
}

export function roundLine(roundNumber: number, rounds: number, remainingMs: number): string {
  return `Round ${roundNumber} of ${rounds} · ${formatClock(remainingMs)} left`;
}

/** A spoken cue needs its clip length plus this margin inside the step. */
export const VOICE_MARGIN_MS = 200;

export function toneFor(set: ToneSet, kind: StepKind | 'complete'): SoundId {
  return `tone.${set}.${kind}`;
}

/**
 * Voice when the clip exists and fits the step with margin; otherwise the
 * step's tone. Hum is an exhale, so it falls back to the exhale tone.
 */
export function soundForStep(
  settings: CueSettings,
  step: Parameters<typeof cueFor>[0],
  roundNumber: number,
  clipMs: (id: CueId) => number | undefined,
): SoundId | null {
  if (settings.mode === 'silent') return null;
  if (settings.mode === 'voice') {
    const id = cueFor(step, roundNumber);
    const length = clipMs(id);
    if (length !== undefined && length + VOICE_MARGIN_MS <= stepMs(step)) return `voice.${id}`;
  }
  return toneFor(settings.toneSet, step.kind);
}

export interface SegmentSchedule {
  cues: Cue[];
  /** Segment clock time when the plan ends. */
  endMs: number;
}

export function buildSchedule(
  plan: SessionPlan,
  startPlanMs: number,
  settings: CueSettings,
  clipMs: (id: CueId) => number | undefined,
): SegmentSchedule {
  const firstStep = plan.steps.findIndex((s) => s.seconds > 0);
  const cues: Cue[] = boundaries(plan.steps, startPlanMs, plan.durationMs).map(({ atMs, round, index }, i) => ({
    atMs: LEAD_MS + atMs - startPlanMs,
    sound: soundForStep(settings, plan.steps[index], round + 1, clipMs),
    haptic: settings.haptics,
    nowPlaying: i === 0 || index === firstStep ? roundLine(round + 1, plan.rounds, plan.durationMs - atMs) : null,
  }));
  const endMs = LEAD_MS + plan.durationMs - startPlanMs;
  cues.push({
    atMs: endMs,
    sound: settings.mode === 'silent' ? null : toneFor(settings.toneSet, 'complete'),
    haptic: settings.haptics,
    nowPlaying: 'Practice complete',
  });
  return { cues, endMs };
}
