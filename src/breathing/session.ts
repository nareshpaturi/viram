/**
 * Practice session state machine (PRD duration contract, FR-02, FR-04).
 *
 * Time comes from one clock: the position of the current audio segment. A
 * segment starts with a three-second neutral lead (settle or resume), then
 * plays the plan from `startPlanMs`. Everything the screen shows is derived
 * from (state, clock) by `readPosition`; nothing here owns a timer.
 */
import { planFor, stepAt, type Plan, type RhythmStep, type StepPosition, type Target } from './rhythm';

export const LEAD_MS = 3000;

export type PauseReason = 'user' | 'call' | 'audio' | 'headphones' | 'lockScreen' | 'locked';

interface Segment {
  purpose: 'settle' | 'resume';
  /** Plan time where this segment's guidance begins (always a step start). */
  startPlanMs: number;
  /** Practice time accrued before this segment. */
  activeBeforeMs: number;
}

export type SessionState =
  | { status: 'intro' }
  | { status: 'active'; segment: Segment }
  | {
      status: 'paused';
      reason: PauseReason;
      /** The interrupted step's start; Resume restarts it. */
      resumePlanMs: number;
      activeMs: number;
      confirmingEnd: boolean;
    }
  | { status: 'finished'; outcome: 'completed' | 'ended'; activeMs: number; completedRounds: number }
  | { status: 'cancelled' };

export interface SessionPlan extends Plan {
  steps: readonly RhythmStep[];
}

export function sessionPlan(steps: readonly RhythmStep[], target: Target): SessionPlan {
  return { ...planFor(steps, target), steps };
}

export const initialState = (withIntro: boolean): SessionState =>
  withIntro ? { status: 'intro' } : settle();

export function settle(): SessionState {
  return { status: 'active', segment: { purpose: 'settle', startPlanMs: 0, activeBeforeMs: 0 } };
}

export interface Position {
  /** Seconds left in the neutral lead, or 0 once guidance runs. */
  countdown: number;
  planMs: number;
  activeMs: number;
  step: StepPosition;
  /** 1-based round being practiced. */
  roundNumber: number;
  roundsLeft: number;
  remainingMs: number;
  done: boolean;
}

export function readPosition(plan: SessionPlan, segment: Segment, clockMs: number): Position {
  const guidedMs = Math.max(0, clockMs - LEAD_MS);
  const planMs = Math.min(plan.durationMs, segment.startPlanMs + guidedMs);
  const done = segment.startPlanMs + guidedMs >= plan.durationMs;
  const step = stepAt(plan.steps, Math.min(planMs, plan.durationMs - 1));
  return {
    countdown: clockMs < LEAD_MS ? Math.ceil((LEAD_MS - clockMs) / 1000) : 0,
    planMs,
    activeMs: segment.activeBeforeMs + (planMs - segment.startPlanMs),
    step,
    roundNumber: step.round + 1,
    roundsLeft: plan.rounds - step.round,
    remainingMs: plan.durationMs - planMs,
    done,
  };
}

/** Freezes guidance. Time in a lead never counts; a partial step's time does. */
export function pause(plan: SessionPlan, state: SessionState, clockMs: number, reason: PauseReason): SessionState {
  if (state.status !== 'active') return state;
  const { segment } = state;
  const position = readPosition(plan, segment, clockMs);
  const inLead = clockMs < LEAD_MS;
  return {
    status: 'paused',
    reason,
    resumePlanMs: inLead ? segment.startPlanMs : position.step.startMs,
    activeMs: inLead ? segment.activeBeforeMs : position.activeMs,
    confirmingEnd: false,
  };
}

/** Restarts the interrupted step after the neutral lead. */
export function resume(state: SessionState): SessionState {
  if (state.status !== 'paused') return state;
  return {
    status: 'active',
    segment: { purpose: 'resume', startPlanMs: state.resumePlanMs, activeBeforeMs: state.activeMs },
  };
}

/** “End this practice?” always asks from a paused state. */
export function requestEnd(plan: SessionPlan, state: SessionState, clockMs: number): SessionState {
  const paused = pause(plan, state, clockMs, 'user');
  return paused.status === 'paused' ? { ...paused, confirmingEnd: true } : paused;
}

/** Dismissing the question leaves the practice paused. */
export function dismissEnd(state: SessionState): SessionState {
  return state.status === 'paused' ? { ...state, confirmingEnd: false } : state;
}

/** Ends early with actual practice time and complete rounds, including zero. */
export function endEarly(plan: SessionPlan, state: SessionState): SessionState {
  if (state.status !== 'paused') return state;
  return {
    status: 'finished',
    outcome: 'ended',
    activeMs: state.activeMs,
    completedRounds: Math.floor(state.resumePlanMs / plan.roundMs),
  };
}

export function complete(plan: SessionPlan, state: SessionState): SessionState {
  if (state.status !== 'active') return state;
  const { segment } = state;
  return {
    status: 'finished',
    outcome: 'completed',
    activeMs: segment.activeBeforeMs + (plan.durationMs - segment.startPlanMs),
    completedRounds: plan.rounds,
  };
}

/** Cancel is offered only before any practice time: the intro or the first settle. */
export function canCancel(state: SessionState, clockMs: number): boolean {
  if (state.status === 'intro') return true;
  return state.status === 'active' && state.segment.purpose === 'settle' && clockMs < LEAD_MS;
}

export function cancel(state: SessionState, clockMs: number): SessionState {
  return canCancel(state, clockMs) ? { status: 'cancelled' } : state;
}
