/**
 * Breathe's Duration sheet (UX07): the targets to choose from, each with how
 * long it really runs. Minute practices offer the minute shortcuts; a
 * practice taught in rounds (4-7-8) offers its library round options. A
 * target that isn't on the list is shown first, as “Your setting”.
 */
import { formatClock } from '../breathing/describe';
import { MINUTE_SHORTCUTS, planFor, type Target } from '../breathing/rhythm';
import { techniqueOf, type Practice } from './practice';

export interface DurationOption {
  target: Target;
  label: string;
  detail: string;
  selected: boolean;
}

export interface DurationChoice {
  question: string;
  options: DurationOption[];
  note: string;
}

const sameTarget = (a: Target, b: Target) =>
  'minutes' in a ? 'minutes' in b && a.minutes === b.minutes : 'rounds' in b && a.rounds === b.rounds;

/** “1 minute”, “5 minutes”, “4 rounds” */
export function targetWords(target: Target): string {
  if ('minutes' in target) return `${target.minutes} ${target.minutes === 1 ? 'minute' : 'minutes'}`;
  return `${target.rounds} ${target.rounds === 1 ? 'round' : 'rounds'}`;
}

/** How long a practice runs with a target, finishing its last round. */
export const runsFor = (practice: Practice, target: Target) => formatClock(planFor(practice.steps, target, practice.slowing ?? null).durationMs);

export function durationChoice(practice: Practice): DurationChoice {
  const technique = techniqueOf(practice);
  const roundOptions = technique?.practice.roundOptions;
  const options: DurationOption[] = roundOptions
    ? roundOptions.map(({ rounds, note }) => {
        const target = { rounds };
        return { target, label: targetWords(target), detail: `Runs ${runsFor(practice, target)} · ${note}`, selected: sameTarget(target, practice.target) };
      })
    : MINUTE_SHORTCUTS.map((minutes) => {
        const target = { minutes };
        return { target, label: targetWords(target), detail: `Runs ${runsFor(practice, target)}`, selected: sameTarget(target, practice.target) };
      });
  if (!options.some((o) => o.selected)) options.unshift({ target: practice.target, label: targetWords(practice.target), detail: 'Your setting', selected: true });
  return roundOptions
    ? { question: 'How many rounds?', options, note: technique!.guidance.roundsNote ?? '' }
    : {
        question: 'How much space do you have?',
        options,
        note: 'Viram always finishes the round, so a practice can run a few seconds longer. Tap a time to use it.',
      };
}

/** Breathe's Duration row: “5 min” and, when the last round runs over, when it finishes. */
export function durationRow(practice: Practice): { value: string; detail: string | null } {
  const plan = planFor(practice.steps, practice.target, practice.slowing ?? null);
  if ('rounds' in practice.target) return { value: `${practice.target.rounds} ${practice.target.rounds === 1 ? 'round' : 'rounds'}`, detail: `Runs ${formatClock(plan.durationMs)}` };
  const exact = plan.durationMs === practice.target.minutes * 60_000;
  return { value: `${practice.target.minutes} min`, detail: exact ? null : `Finishes the round at ${formatClock(plan.durationMs)}` };
}
