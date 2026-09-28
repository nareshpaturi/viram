import { LIBRARY } from '../../content/library';
import {
  LEAD_MS,
  cancel,
  canCancel,
  complete,
  dismissEnd,
  endEarly,
  initialState,
  pause,
  readPosition,
  requestEnd,
  resume,
  sessionPlan,
  settle,
  type SessionState,
} from '../session';

const box = sessionPlan(
  [
    { kind: 'inhale', seconds: 4 },
    { kind: 'hold', seconds: 4 },
    { kind: 'exhale', seconds: 4 },
    { kind: 'rest', seconds: 4 },
  ],
  { minutes: 5 },
);
const segmentOf = (state: SessionState) => {
  if (state.status !== 'active') throw new Error(`expected active, got ${state.status}`);
  return state.segment;
};

describe('session state machine', () => {
  it('counts down the neutral lead before guidance', () => {
    const state = initialState(false);
    const position = readPosition(box, segmentOf(state), 0);
    expect(position.countdown).toBe(3);
    expect(position.activeMs).toBe(0);
    expect(readPosition(box, segmentOf(state), 2001).countdown).toBe(1);
    expect(readPosition(box, segmentOf(state), LEAD_MS).countdown).toBe(0);
  });

  it('starts with the introduction when there is one', () => {
    expect(initialState(true)).toEqual({ status: 'intro' });
    expect(settle().status).toBe('active');
  });

  it('shows round, rounds left, and time left', () => {
    const position = readPosition(box, segmentOf(settle()), LEAD_MS + 20_000);
    expect(position).toMatchObject({ roundNumber: 2, roundsLeft: 18, remainingMs: 304_000 - 20_000 });
    expect(position.step).toMatchObject({ index: 1, elapsedMs: 0 });
  });

  it('pause keeps partial time and resume restarts the interrupted step', () => {
    // 21.5 s into the plan: round 2, hold step (started at 20 s).
    const paused = pause(box, settle(), LEAD_MS + 21_500, 'call');
    expect(paused).toMatchObject({ status: 'paused', reason: 'call', resumePlanMs: 20_000, activeMs: 21_500 });

    const resumed = resume(paused);
    const segment = segmentOf(resumed);
    expect(segment).toMatchObject({ purpose: 'resume', startPlanMs: 20_000, activeBeforeMs: 21_500 });
    const afterLead = readPosition(box, segment, LEAD_MS);
    expect(afterLead).toMatchObject({ planMs: 20_000, activeMs: 21_500, roundNumber: 2 });
    expect(afterLead.step.index).toBe(1);
  });

  it('never counts the lead or paused time', () => {
    const pausedInLead = pause(box, settle(), 1_000, 'user');
    expect(pausedInLead).toMatchObject({ resumePlanMs: 0, activeMs: 0 });
    const again = pause(box, resume(pausedInLead), 2_999, 'user');
    expect(again).toMatchObject({ resumePlanMs: 0, activeMs: 0 });
  });

  it('completes on a whole round with exact time', () => {
    const state = settle();
    expect(readPosition(box, segmentOf(state), LEAD_MS + 303_999).done).toBe(false);
    expect(readPosition(box, segmentOf(state), LEAD_MS + 304_000).done).toBe(true);
    expect(complete(box, state)).toEqual({ status: 'finished', outcome: 'completed', activeMs: 304_000, completedRounds: 19 });
  });

  it('completes after a resume with the prior partial time included', () => {
    const paused = pause(box, settle(), LEAD_MS + 21_500, 'user');
    expect(complete(box, resume(paused))).toMatchObject({ activeMs: 21_500 + (304_000 - 20_000), completedRounds: 19 });
  });

  it('asks before ending and ends with complete rounds, including zero', () => {
    const asking = requestEnd(box, settle(), LEAD_MS + 42_000);
    expect(asking).toMatchObject({ status: 'paused', confirmingEnd: true });
    expect(dismissEnd(asking)).toMatchObject({ status: 'paused', confirmingEnd: false });
    expect(endEarly(box, asking)).toEqual({ status: 'finished', outcome: 'ended', activeMs: 42_000, completedRounds: 2 });

    const early = requestEnd(box, settle(), LEAD_MS + 5_000);
    expect(endEarly(box, early)).toMatchObject({ completedRounds: 0, activeMs: 5_000 });
  });

  it('cancels only before any practice time', () => {
    expect(canCancel({ status: 'intro' }, 0)).toBe(true);
    expect(cancel(settle(), 2_000)).toEqual({ status: 'cancelled' });
    expect(canCancel(settle(), LEAD_MS)).toBe(false);
    expect(canCancel(resume(pause(box, settle(), LEAD_MS + 1_000, 'user')), 0)).toBe(false);
  });

  it('runs a rounds target to exactly that many rounds', () => {
    const nadi = LIBRARY.find((t) => t.id === 'nadi-shodhana')!.practice;
    const plan = sessionPlan(nadi.steps, { rounds: 21 });
    expect(plan.durationMs).toBe(21 * 20_000);
    const nearEnd = readPosition(plan, segmentOf(settle()), LEAD_MS + plan.durationMs - 1);
    expect(nearEnd).toMatchObject({ roundNumber: 21, roundsLeft: 1, done: false });
    expect(nearEnd.step.index).toBe(3);
  });
});
