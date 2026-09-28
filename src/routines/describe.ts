import { formatClock } from '../breathing/describe';
import { plannedDurationMs, sessionPlan } from '../breathing/session';
import type { Practice } from '../practice/practice';

/** Planned practice time, each practice rounded up to its own whole rounds (FR-14). */
export function routineDurationMs(parts: readonly Practice[]): number {
  return plannedDurationMs(parts.map((p) => sessionPlan(p.steps, p.target)));
}

/** “3 practices · 12:00” */
export function routineSummary(parts: readonly Practice[]): string {
  return `${parts.length} ${parts.length === 1 ? 'practice' : 'practices'} · ${formatClock(routineDurationMs(parts))}`;
}

/** “Ujjayi → Nadi Shodhana → Bhramari” */
export const routineChain = (parts: readonly { name: string }[]) => parts.map((p) => p.name).join(' → ');
