/**
 * Practice session state machine (PRD duration contract, FR-02, FR-04, FR-14).
 *
 * A session runs one or more parts: a single practice is one part, and a
 * routine is 2–6. Time comes from one clock, the position of the current
 * audio segment. A segment is laid out as
 *
 *   [lead][part k from startPlanMs][5 s transition][part k+1] … [last part]
 *
 * so a routine plays on one continuous audio timeline and moves between
 * practices without JavaScript, even with the screen locked. The lead is
 * three neutral seconds to settle or resume; transitions are five. Neither
 * counts as practice time. Everything the screen shows is derived from
 * (state, clock) by `readPosition`; nothing here owns a timer.
 */
import { planFor, stepAt, type Plan, type RhythmStep, type StepPosition, type Target } from './rhythm';

export const LEAD_MS = 3000;
/** The routine transition screen: five quiet seconds, not practice time. */
export const TRANSITION_MS = 5000;

export type PauseReason = 'user' | 'call' | 'audio' | 'headphones' | 'lockScreen' | 'locked';

export interface Segment {
  purpose: 'settle' | 'resume';
  /** The part this segment starts in. */
  part: number;
  /** Plan time in that part where guidance begins (always a step start). */
  startPlanMs: number;
  /** That part's practice time accrued before this segment. */
  activeBeforeMs: number;
}

export interface PartResult {
  activeMs: number;
  completedRounds: number;
  outcome: 'completed' | 'ended';
}

export type SessionState =
  | { status: 'intro' }
  /** `done` holds the parts finished before this segment began. */
  | { status: 'active'; segment: Segment; done: PartResult[] }
  | {
      status: 'paused';
      reason: PauseReason;
      part: number;
      /** The interrupted step's start; Resume restarts it. */
      resumePlanMs: number;
      /** This part's practice time so far. */
      activeMs: number;
      confirmingEnd: boolean;
      done: PartResult[];
    }
  | { status: 'finished'; outcome: 'completed' | 'ended'; parts: PartResult[] }
  | { status: 'cancelled' };

export interface SessionPlan extends Plan {
  steps: readonly RhythmStep[];
}

export function sessionPlan(steps: readonly RhythmStep[], target: Target): SessionPlan {
  return { ...planFor(steps, target), steps };
}

export const initialState = (withIntro: boolean): SessionState => (withIntro ? { status: 'intro' } : settle());

export function settle(): SessionState {
  return { status: 'active', segment: { purpose: 'settle', part: 0, startPlanMs: 0, activeBeforeMs: 0 }, done: [] };
}

/** Where part `part` sits on this segment's clock. */
export interface PartSpan {
  part: number;
  /** Segment clock time the part's lead (or transition) begins. */
  offsetMs: number;
  leadMs: number;
  startPlanMs: number;
  activeBeforeMs: number;
}

/** The parts this segment will play, in clock order. */
export function segmentLayout(plans: readonly SessionPlan[], segment: Segment): PartSpan[] {
  const spans: PartSpan[] = [];
  let offsetMs = 0;
  for (let part = segment.part; part < plans.length; part++) {
    const first = part === segment.part;
    const span: PartSpan = {
      part,
      offsetMs,
      leadMs: first ? LEAD_MS : TRANSITION_MS,
      startPlanMs: first ? segment.startPlanMs : 0,
      activeBeforeMs: first ? segment.activeBeforeMs : 0,
    };
    spans.push(span);
    offsetMs += span.leadMs + plans[part].durationMs - span.startPlanMs;
  }
  return spans;
}

export function segmentEndMs(plans: readonly SessionPlan[], segment: Segment): number {
  const spans = segmentLayout(plans, segment);
  const last = spans[spans.length - 1];
  return last.offsetMs + last.leadMs + plans[last.part].durationMs - last.startPlanMs;
}

export interface Position {
  part: number;
  /** In a lead: settle or resume for the segment's first part, transition for later ones. */
  lead: 'settle' | 'resume' | 'transition' | null;
  /** Seconds left in the lead, or 0 once guidance runs. */
  countdown: number;
  planMs: number;
  /** This part's practice time. */
  activeMs: number;
  step: StepPosition;
  /** 1-based round being practiced. */
  roundNumber: number;
  roundsLeft: number;
  /** Time left in this part. */
  remainingMs: number;
  /** Parts finished earlier in this segment. */
  finishedInSegment: PartResult[];
  /** The last part has reached its final round. */
  done: boolean;
}

export function readPosition(plans: readonly SessionPlan[], segment: Segment, clockMs: number): Position {
  const spans = segmentLayout(plans, segment);
  const span = [...spans].reverse().find((s) => clockMs >= s.offsetMs) ?? spans[0];
  const plan = plans[span.part];
  const local = clockMs - span.offsetMs;
  const guidedMs = Math.max(0, local - span.leadMs);
  const planMs = Math.min(plan.durationMs, span.startPlanMs + guidedMs);
  const step = stepAt(plan.steps, Math.min(planMs, plan.durationMs - 1));
  const inLead = local < span.leadMs;
  return {
    part: span.part,
    lead: inLead ? (span.part === segment.part ? segment.purpose : 'transition') : null,
    countdown: inLead ? Math.ceil((span.leadMs - local) / 1000) : 0,
    planMs,
    activeMs: span.activeBeforeMs + (planMs - span.startPlanMs),
    step,
    roundNumber: step.round + 1,
    roundsLeft: plan.rounds - step.round,
    remainingMs: plan.durationMs - planMs,
    finishedInSegment: spans
      .filter((s) => s.part < span.part)
      .map((s) => ({ activeMs: s.activeBeforeMs + plans[s.part].durationMs - s.startPlanMs, completedRounds: plans[s.part].rounds, outcome: 'completed' })),
    done: span.part === plans.length - 1 && span.startPlanMs + guidedMs >= plan.durationMs,
  };
}

/** Freezes guidance. Time in a lead never counts; a partial step's time does. */
export function pause(plans: readonly SessionPlan[], state: SessionState, clockMs: number, reason: PauseReason): SessionState {
  if (state.status !== 'active') return state;
  const position = readPosition(plans, state.segment, clockMs);
  const inLead = position.lead !== null;
  return {
    status: 'paused',
    reason,
    part: position.part,
    resumePlanMs: inLead ? position.planMs : position.step.startMs,
    activeMs: position.activeMs,
    confirmingEnd: false,
    done: [...state.done, ...position.finishedInSegment],
  };
}

/** Restarts the interrupted step after the neutral lead. */
export function resume(state: SessionState): SessionState {
  if (state.status !== 'paused') return state;
  return {
    status: 'active',
    segment: { purpose: 'resume', part: state.part, startPlanMs: state.resumePlanMs, activeBeforeMs: state.activeMs },
    done: state.done,
  };
}

/** “End this practice?” always asks from a paused state. */
export function requestEnd(plans: readonly SessionPlan[], state: SessionState, clockMs: number): SessionState {
  const paused = pause(plans, state, clockMs, 'user');
  return paused.status === 'paused' ? { ...paused, confirmingEnd: true } : paused;
}

/** Dismissing the question leaves the practice paused. */
export function dismissEnd(state: SessionState): SessionState {
  return state.status === 'paused' ? { ...state, confirmingEnd: false } : state;
}

/**
 * Ends early with actual practice time and complete rounds, including zero.
 * In a routine, finished parts keep their results and the current part is
 * recorded as ended early; parts not reached are left out.
 */
export function endEarly(plans: readonly SessionPlan[], state: SessionState): SessionState {
  if (state.status !== 'paused') return state;
  const current: PartResult = {
    activeMs: state.activeMs,
    completedRounds: Math.floor(state.resumePlanMs / plans[state.part].roundMs),
    outcome: 'ended',
  };
  return { status: 'finished', outcome: 'ended', parts: [...state.done, current] };
}

/** The last part reached its final round: every part completes on a whole round. */
export function complete(plans: readonly SessionPlan[], state: SessionState): SessionState {
  if (state.status !== 'active') return state;
  const spans = segmentLayout(plans, state.segment);
  const parts: PartResult[] = spans.map((s) => ({
    activeMs: s.activeBeforeMs + plans[s.part].durationMs - s.startPlanMs,
    completedRounds: plans[s.part].rounds,
    outcome: 'completed',
  }));
  return { status: 'finished', outcome: 'completed', parts: [...state.done, ...parts] };
}

/** Cancel is offered only before any practice time: the intro or the first settle. */
export function canCancel(state: SessionState, clockMs: number): boolean {
  if (state.status === 'intro') return true;
  return state.status === 'active' && state.segment.purpose === 'settle' && state.segment.part === 0 && clockMs < LEAD_MS;
}

export function cancel(state: SessionState, clockMs: number): SessionState {
  return canCancel(state, clockMs) ? { status: 'cancelled' } : state;
}

/** Whole-session totals for the record and the summary. */
export function totals(parts: readonly PartResult[]): { activeMs: number; completedRounds: number } {
  return {
    activeMs: parts.reduce((sum, p) => sum + p.activeMs, 0),
    completedRounds: parts.reduce((sum, p) => sum + p.completedRounds, 0),
  };
}

/** Planned practice time: each part rounds up to whole rounds of its own practice (FR-14). */
export function plannedDurationMs(plans: readonly SessionPlan[]): number {
  return plans.reduce((sum, plan) => sum + plan.durationMs, 0);
}
