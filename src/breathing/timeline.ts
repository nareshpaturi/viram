/**
 * Builds the cue schedule the native audio timeline plays for one segment
 * (FR-02, FR-03). Times are segment clock times: the neutral lead (settle,
 * resume, or a routine transition) comes
 * first, then one cue per non-zero step boundary, then the completion cue.
 */
import { countCue, cueFor, type CueId } from '../content/voice';
import { LEAD_MS, segmentEndMs, segmentLayout, type Segment, type SessionPlan } from './session';
import { formatClock } from './describe';
import { planBoundaries, stepMs, type StepKind } from './rhythm';

export type CueMode = 'voice' | 'tones' | 'silent';
export type ToneSet = 'soft-bells' | 'wood' | 'chimes';
export type HapticStrength = 'light' | 'medium' | 'strong';

export interface CueSettings {
  mode: CueMode;
  toneSet: ToneSet;
  haptics: HapticStrength | null;
  /** Night practice (FR-23): the softest completion tone and a light tap. */
  softFinish?: boolean;
  /** Fuller voice (FR-19): count each whole second within a step, in Voice mode. */
  counting?: boolean;
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

/**
 * “Two, three, four” on each whole second after the step cue. A number is
 * spoken only when it fits its second with margin and starts after the
 * step cue has finished; otherwise that second stays quiet (the v1.0
 * timing-fallback rule). Counts carry no haptic.
 */
export function countCues(step: Parameters<typeof stepMs>[0], atMs: number, stepSound: SoundId | null, clipMs: (id: CueId) => number | undefined): Cue[] {
  const spokenUntil = stepSound?.startsWith('voice.') ? (clipMs(stepSound.slice('voice.'.length) as CueId) ?? 0) + VOICE_MARGIN_MS : 0;
  const cues: Cue[] = [];
  for (let n = 2; n <= Math.floor(step.seconds); n++) {
    const offset = (n - 1) * 1000;
    const id = countCue(n);
    const length = id ? clipMs(id) : undefined;
    if (!id || length === undefined || offset < spokenUntil || length + VOICE_MARGIN_MS > 1000) continue;
    cues.push({ atMs: atMs + offset, sound: `voice.${id}`, haptic: null, nowPlaying: null });
  }
  return cues;
}

/**
 * The number inside the guide during a whole-second step: the seconds left,
 * or, while the voice counts within steps, the count being spoken (1 with
 * the step cue, then 2, 3, 4), so what is heard and what is shown agree.
 */
export function guideCount(durationMs: number, elapsedMs: number, countingAloud: boolean): number {
  if (countingAloud) return Math.min(Math.ceil(durationMs / 1000), Math.floor(elapsedMs / 1000) + 1);
  return Math.ceil((durationMs - elapsedMs) / 1000);
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
  leadMs: number = LEAD_MS,
  withCompletion = true,
): SegmentSchedule {
  const firstStep = plan.steps.findIndex((s) => s.seconds > 0);
  const cues: Cue[] = planBoundaries(plan, startPlanMs, plan.durationMs).flatMap(({ atMs, round, index, step }, i) => {
    const sound = soundForStep(settings, step, round + 1, clipMs);
    const at = leadMs + atMs - startPlanMs;
    const stepCue: Cue = {
      atMs: at,
      sound,
      haptic: settings.haptics,
      nowPlaying: i === 0 || index === firstStep ? roundLine(round + 1, plan.rounds, plan.durationMs - atMs) : null,
    };
    return settings.counting && settings.mode === 'voice' ? [stepCue, ...countCues(step, at, sound, clipMs)] : [stepCue];
  });
  const endMs = leadMs + plan.durationMs - startPlanMs;
  if (!withCompletion) return { cues, endMs };
  cues.push({
    atMs: endMs,
    sound: settings.mode === 'silent' ? null : toneFor(settings.softFinish ? 'soft-bells' : settings.toneSet, 'complete'),
    haptic: settings.softFinish && settings.haptics ? 'light' : settings.haptics,
    nowPlaying: 'Practice complete',
  });
  return { cues, endMs };
}

/**
 * One segment of a run: the segment's first part from its start, then each
 * later part after a quiet five-second transition, on one timeline. Only the
 * last part ends with the completion cue.
 */
export function buildRunSchedule(
  plans: readonly SessionPlan[],
  segment: Segment,
  settings: CueSettings,
  clipMs: (id: CueId) => number | undefined,
  names: readonly string[],
): SegmentSchedule {
  const spans = segmentLayout(plans, segment);
  const cues: Cue[] = spans.flatMap((span, i) => {
    const last = i === spans.length - 1;
    const part = buildSchedule(plans[span.part], span.startPlanMs, settings, clipMs, span.leadMs, last);
    const shifted = part.cues.map((cue) => ({ ...cue, atMs: cue.atMs + span.offsetMs }));
    if (span.part === segment.part) return shifted;
    return [{ atMs: span.offsetMs, sound: null, haptic: null, nowPlaying: `Up next · ${names[span.part]}` }, ...shifted];
  });
  return { cues, endMs: segmentEndMs(plans, segment) };
}
