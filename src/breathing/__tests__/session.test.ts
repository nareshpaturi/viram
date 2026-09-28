import { LIBRARY } from '../../content/library';
import type { CueId } from '../../content/voice';
import {
  LEAD_MS,
  TRANSITION_MS,
  cancel,
  canCancel,
  complete,
  dismissEnd,
  endEarly,
  initialState,
  pause,
  plannedDurationMs,
  readPosition,
  requestEnd,
  resume,
  segmentEndMs,
  sessionPlan,
  settle,
  totals,
  type SessionState,
} from '../session';
import { formatClock } from '../describe';
import { buildRunSchedule } from '../timeline';

const practice = (id: string) => LIBRARY.find((t) => t.id === id)!.practice;
const box = sessionPlan(practice('sama-vritti').steps, { minutes: 5 });
const one = [box];
const segmentOf = (state: SessionState) => {
  if (state.status !== 'active') throw new Error(`expected active, got ${state.status}`);
  return state.segment;
};

describe('single practice', () => {
  it('counts down the neutral lead before guidance', () => {
    const state = initialState(false);
    expect(readPosition(one, segmentOf(state), 0)).toMatchObject({ countdown: 3, activeMs: 0, lead: 'settle' });
    expect(readPosition(one, segmentOf(state), 2001).countdown).toBe(1);
    expect(readPosition(one, segmentOf(state), LEAD_MS)).toMatchObject({ countdown: 0, lead: null });
  });

  it('starts with the introduction when there is one', () => {
    expect(initialState(true)).toEqual({ status: 'intro' });
    expect(settle().status).toBe('active');
  });

  it('shows round, rounds left, and time left', () => {
    const position = readPosition(one, segmentOf(settle()), LEAD_MS + 20_000);
    expect(position).toMatchObject({ part: 0, roundNumber: 2, roundsLeft: 18, remainingMs: 304_000 - 20_000 });
    expect(position.step).toMatchObject({ index: 1, elapsedMs: 0 });
  });

  it('pause keeps partial time and resume restarts the interrupted step', () => {
    const paused = pause(one, settle(), LEAD_MS + 21_500, 'call');
    expect(paused).toMatchObject({ status: 'paused', reason: 'call', part: 0, resumePlanMs: 20_000, activeMs: 21_500 });
    const segment = segmentOf(resume(paused));
    expect(segment).toMatchObject({ purpose: 'resume', startPlanMs: 20_000, activeBeforeMs: 21_500 });
    expect(readPosition(one, segment, 0).lead).toBe('resume');
    expect(readPosition(one, segment, LEAD_MS)).toMatchObject({ planMs: 20_000, activeMs: 21_500, roundNumber: 2 });
  });

  it('never counts the lead or paused time', () => {
    const pausedInLead = pause(one, settle(), 1_000, 'user');
    expect(pausedInLead).toMatchObject({ resumePlanMs: 0, activeMs: 0 });
    expect(pause(one, resume(pausedInLead), 2_999, 'user')).toMatchObject({ resumePlanMs: 0, activeMs: 0 });
  });

  it('completes on a whole round with exact time', () => {
    const state = settle();
    expect(readPosition(one, segmentOf(state), LEAD_MS + 303_999).done).toBe(false);
    expect(readPosition(one, segmentOf(state), LEAD_MS + 304_000).done).toBe(true);
    expect(segmentEndMs(one, segmentOf(state))).toBe(LEAD_MS + 304_000);
    expect(complete(one, state)).toEqual({
      status: 'finished',
      outcome: 'completed',
      parts: [{ activeMs: 304_000, completedRounds: 19, outcome: 'completed' }],
    });
  });

  it('completes after a resume with the prior partial time included', () => {
    const finished = complete(one, resume(pause(one, settle(), LEAD_MS + 21_500, 'user')));
    expect(finished.status === 'finished' && totals(finished.parts)).toEqual({ activeMs: 21_500 + (304_000 - 20_000), completedRounds: 19 });
  });

  it('asks before ending and ends with complete rounds, including zero', () => {
    const asking = requestEnd(one, settle(), LEAD_MS + 42_000);
    expect(asking).toMatchObject({ status: 'paused', confirmingEnd: true });
    expect(dismissEnd(asking)).toMatchObject({ status: 'paused', confirmingEnd: false });
    expect(endEarly(one, asking)).toEqual({ status: 'finished', outcome: 'ended', parts: [{ activeMs: 42_000, completedRounds: 2, outcome: 'ended' }] });
    expect(endEarly(one, requestEnd(one, settle(), LEAD_MS + 5_000))).toMatchObject({ parts: [{ completedRounds: 0, activeMs: 5_000 }] });
  });

  it('cancels only before any practice time', () => {
    expect(canCancel({ status: 'intro' }, 0)).toBe(true);
    expect(cancel(settle(), 2_000)).toEqual({ status: 'cancelled' });
    expect(canCancel(settle(), LEAD_MS)).toBe(false);
    expect(canCancel(resume(pause(one, settle(), LEAD_MS + 1_000, 'user')), 0)).toBe(false);
  });

  it('runs a rounds target to exactly that many rounds', () => {
    const plans = [sessionPlan(practice('nadi-shodhana').steps, { rounds: 21 })];
    expect(plans[0].durationMs).toBe(21 * 20_000);
    expect(readPosition(plans, segmentOf(settle()), LEAD_MS + plans[0].durationMs - 1)).toMatchObject({ roundNumber: 21, roundsLeft: 1, done: false });
  });
});

describe('routines (FR-14)', () => {
  // Box 3 min then coherent 5 min: 12 rounds / 3:12 + 28 rounds / 5:08 = 8:20.
  const routine = [sessionPlan(practice('sama-vritti').steps, { minutes: 3 }), sessionPlan(practice('coherent').steps, { minutes: 5 })];
  const secondStart = LEAD_MS + 192_000;

  it('rounds each part up to its own whole rounds', () => {
    expect(routine.map((p) => [p.rounds, formatClock(p.durationMs)])).toEqual([
      [12, '3:12'],
      [28, '5:08'],
    ]);
    expect(formatClock(plannedDurationMs(routine))).toBe('8:20');
  });

  it('lays the routine on one timeline with a quiet five-second transition that is not practice time', () => {
    const segment = segmentOf(settle());
    expect(segmentEndMs(routine, segment)).toBe(LEAD_MS + 192_000 + TRANSITION_MS + 308_000);
    expect(readPosition(routine, segment, secondStart + 4_000)).toMatchObject({
      part: 1,
      lead: 'transition',
      countdown: 1,
      activeMs: 0,
      finishedInSegment: [{ activeMs: 192_000, completedRounds: 12, outcome: 'completed' }],
      done: false,
    });
    expect(readPosition(routine, segment, secondStart + TRANSITION_MS + 11_000)).toMatchObject({ part: 1, lead: null, activeMs: 11_000, roundNumber: 2 });
    expect(readPosition(routine, segment, segmentEndMs(routine, segment)).done).toBe(true);
    const finished = complete(routine, settle());
    expect(finished.status === 'finished' && totals(finished.parts)).toEqual({ activeMs: 500_000, completedRounds: 40 });
  });

  it('pausing during a transition resumes that practice from its start, with nothing counted', () => {
    const paused = pause(routine, settle(), secondStart + 2_000, 'call');
    expect(paused).toMatchObject({ status: 'paused', part: 1, resumePlanMs: 0, activeMs: 0, done: [{ completedRounds: 12 }] });
    const segment = segmentOf(resume(paused));
    expect(segment).toMatchObject({ purpose: 'resume', part: 1, startPlanMs: 0 });
    expect(readPosition(routine, segment, 0)).toMatchObject({ part: 1, lead: 'resume', countdown: 3 });
  });

  it('ending during a later part keeps finished parts and marks the current one ended', () => {
    const asking = requestEnd(routine, settle(), secondStart + TRANSITION_MS + 23_000);
    expect(endEarly(routine, asking)).toEqual({
      status: 'finished',
      outcome: 'ended',
      parts: [
        { activeMs: 192_000, completedRounds: 12, outcome: 'completed' },
        { activeMs: 23_000, completedRounds: 2, outcome: 'ended' },
      ],
    });
  });

  it('a resumed later part completes with earlier results kept', () => {
    const paused = pause(routine, settle(), secondStart + TRANSITION_MS + 23_000, 'user');
    const finished = complete(routine, resume(paused));
    expect(finished).toMatchObject({ status: 'finished', parts: [{ completedRounds: 12 }, { completedRounds: 28, activeMs: 23_000 + 308_000 - 22_000 }] });
  });

  it('schedules both practices on one timeline, with the completion cue only at the end', () => {
    const clips = (id: CueId) => (id.length < 8 ? 500 : 900);
    const { cues, endMs } = buildRunSchedule(routine, segmentOf(settle()), { mode: 'tones', toneSet: 'wood', haptics: null }, clips, ['Sama Vritti', 'Coherent breathing']);
    const completions = cues.filter((c) => c.sound?.endsWith('.complete'));
    expect(completions).toEqual([{ atMs: endMs, sound: 'tone.wood.complete', haptic: null, nowPlaying: 'Practice complete' }]);
    expect(cues.find((c) => c.nowPlaying?.startsWith('Up next'))).toEqual({ atMs: secondStart, sound: null, haptic: null, nowPlaying: 'Up next · Coherent breathing' });
    expect(cues.filter((c) => c.sound === 'tone.wood.inhale')[12].atMs).toBe(secondStart + TRANSITION_MS);
  });

  it('cannot cancel once a routine is under way', () => {
    expect(canCancel(resume(pause(routine, settle(), secondStart + 1_000, 'user')), 0)).toBe(false);
  });
});
