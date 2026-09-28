/**
 * Plain-language names for steps and rhythms, shared by every screen, the
 * share preview, and the lock screen. Labels always carry the meaning;
 * colors and shapes only reinforce it.
 */
import { formatPace, planFor, slowedSteps, type Plan, type RhythmStep, type Slowing, type Target } from './rhythm';

const KIND_LABEL = { inhale: 'Inhale', hold: 'Hold after inhale', exhale: 'Exhale', rest: 'Rest' } as const;

/** “Inhale left”, “Hum”, “Hold after inhale”. */
export function stepLabel(step: RhythmStep): string {
  if (step.cue === 'hum') return 'Hum';
  return step.side ? `${KIND_LABEL[step.kind]} ${step.side}` : KIND_LABEL[step.kind];
}

/** Shown under the label on mouth steps, every round. */
export function routeLabel(step: RhythmStep): string | null {
  if (step.route !== 'mouth') return null;
  return step.kind === 'inhale' ? 'In through the mouth' : 'Out through the mouth';
}

export const formatSeconds = (seconds: number): string => String(seconds);

const isAlternateNostril = (steps: readonly RhythmStep[]): boolean =>
  steps.length === 4 &&
  steps[0].kind === 'inhale' &&
  steps[1].kind === 'exhale' &&
  steps[2].kind === 'inhale' &&
  steps[3].kind === 'exhale' &&
  steps[0].side !== undefined &&
  steps[0].side !== steps[1].side &&
  steps[1].side === steps[2].side &&
  steps[2].side !== steps[3].side &&
  steps[0].seconds === steps[2].seconds &&
  steps[1].seconds === steps[3].seconds;

const isFourRow = (steps: readonly RhythmStep[]): boolean =>
  steps.length === 4 && steps.every((s, i) => s.kind === ['inhale', 'hold', 'exhale', 'rest'][i] && !s.side);

/**
 * Compact rhythm: “4 · 4 · 4 · 4”, “in 4 · out 6”, “in 4 · out 6, each side”,
 * “in 4 · hum 8”, “4 · 7 · 8 · rest off”.
 */
export function describeRhythm(steps: readonly RhythmStep[]): string {
  const s = formatSeconds;
  if (isAlternateNostril(steps)) return `in ${s(steps[0].seconds)} · out ${s(steps[1].seconds)}, each side`;
  if (isFourRow(steps)) {
    const [inhale, hold, exhale, rest] = steps;
    if (hold.seconds === 0 && rest.seconds === 0) return `in ${s(inhale.seconds)} · out ${s(exhale.seconds)}`;
    return [
      s(inhale.seconds),
      hold.seconds === 0 ? 'hold off' : s(hold.seconds),
      s(exhale.seconds),
      rest.seconds === 0 ? 'rest off' : s(rest.seconds),
    ].join(' · ');
  }
  return steps
    .filter((step) => step.seconds > 0)
    .map((step) => {
      const word = step.cue === 'hum' ? 'hum' : step.kind === 'inhale' ? 'in' : step.kind === 'exhale' ? 'out' : step.kind;
      return `${word} ${s(step.seconds)}${step.side ? ` ${step.side}` : ''}`;
    })
    .join(' · ');
}

/** Screen-reader version: “Inhale left 4 seconds, Exhale right 6 seconds …”. Off steps say Off. */
export function speakRhythm(steps: readonly RhythmStep[]): string {
  return steps
    .map((step) => `${stepLabel(step)} ${step.seconds === 0 ? 'off' : `${step.seconds} seconds`}`)
    .join(', ');
}

export function describeTarget(target: Target): string {
  if ('minutes' in target) return `${target.minutes} min`;
  return `${target.rounds} ${target.rounds === 1 ? 'round' : 'rounds'}`;
}

/** “5:04”, or “1:02:30” past an hour. */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = String(total % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
}

/** “19 rounds · 5:04” */
export function describePlan(steps: readonly RhythmStep[], target: Target, slowing: Slowing | null = null): string {
  const plan = planFor(steps, target, slowing);
  return `${plan.rounds} ${plan.rounds === 1 ? 'round' : 'rounds'} · ${formatClock(plan.durationMs)}`;
}

/** Guided breaths per minute: “6”, or “5.5 → 4.6” with gradual slowing (FR-24). */
export function describePace(plan: Pick<Plan, 'breathsPerMinute' | 'endBreathsPerMinute'>): string {
  const start = formatPace(plan.breathsPerMinute);
  const end = formatPace(plan.endBreathsPerMinute);
  return start === end ? start : `${start} → ${end}`;
}

/** “Slows to in 6.5 · out 6.5” */
export function describeSlowing(steps: readonly RhythmStep[], slowing: Slowing): string {
  return `Slows to ${describeRhythm(slowedSteps(steps, slowing, 1, 2))}`;
}

/** “5 min · 15 rounds · 5:00”, or “21 rounds · 7:42” when the target is rounds. */
export function describeTargetAndPlan(steps: readonly RhythmStep[], target: Target): string {
  const plan = describePlan(steps, target);
  return 'minutes' in target ? `${describeTarget(target)} · ${plan}` : plan;
}
