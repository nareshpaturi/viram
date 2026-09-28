import { describePace, formatClock } from '../describe';
import {
  checkSlowing,
  isValidSlowing,
  planBoundaries,
  planFor,
  planStepAt,
  roundSteps,
  slowedSteps,
  type RhythmStep,
} from '../rhythm';
import { complete, endEarly, pause, readPosition, sessionPlan, settle, LEAD_MS } from '../session';
import { buildSchedule } from '../timeline';

const coherent: RhythmStep[] = [
  { kind: 'inhale', seconds: 5.5 },
  { kind: 'exhale', seconds: 5.5 },
];
const box: RhythmStep[] = [
  { kind: 'inhale', seconds: 4 },
  { kind: 'hold', seconds: 4 },
  { kind: 'exhale', seconds: 4 },
  { kind: 'rest', seconds: 2 },
];
const slow = { inhale: 6.5, exhale: 6.5 };

describe('gradual slowing', () => {
  it('matches the design example: 5.5 → 6.5 over 5 minutes is 25 rounds, 5:00, 5.5 → 4.6 breaths/min', () => {
    const plan = planFor(coherent, { minutes: 5 }, slow);
    expect(plan.rounds).toBe(25);
    // Each step rounds to 0.1 s, so the total can land a few tenths past 5:00.
    expect(formatClock(plan.durationMs)).toBe('5:00');
    expect(Math.abs(plan.durationMs - 300_000)).toBeLessThan(1000);
    expect(describePace(plan)).toBe('5.5 → 4.6');
  });

  it('moves evenly round by round to 0.1 s, holds unchanged, from the start to the end', () => {
    const rounds = 7;
    const firsts = Array.from({ length: rounds }, (_, r) => slowedSteps(box, { inhale: 5, exhale: 6 }, r, rounds));
    expect(firsts[0].map((s) => s.seconds)).toEqual([4, 4, 4, 2]);
    expect(firsts[rounds - 1].map((s) => s.seconds)).toEqual([5, 4, 6, 2]);
    expect(firsts[3].map((s) => s.seconds)).toEqual([4.5, 4, 5, 2]);
    for (const steps of firsts) {
      for (const s of steps) expect(Math.round(s.seconds * 10) / 10).toBe(s.seconds);
      expect(steps[1].seconds).toBe(4);
    }
    const diffs = firsts.slice(1).map((s, i) => s[2].seconds - firsts[i][2].seconds);
    // Even steps of 1/3 s, each within the 0.1 s rounding.
    for (const d of diffs) expect(Math.abs(d - 1 / 3)).toBeLessThanOrEqual(0.1 + 1e-9);
  });

  it('ends on a whole round that reaches the target, with the fewest rounds', () => {
    for (const minutes of [1, 3, 5, 10]) {
      const plan = planFor(box, { minutes }, { inhale: 6, exhale: 8 });
      const starts = plan.roundStartsMs!;
      expect(starts[plan.rounds]).toBe(plan.durationMs);
      expect(plan.durationMs).toBeGreaterThanOrEqual(minutes * 60_000);
      // One round fewer, laid out again, falls short.
      const fewer = planFor(box, { rounds: plan.rounds - 1 }, { inhale: 6, exhale: 8 });
      expect(fewer.durationMs).toBeLessThan(minutes * 60_000);
    }
  });

  it('keeps a rounds target exactly', () => {
    const plan = planFor(coherent, { rounds: 11 }, slow);
    expect(plan.rounds).toBe(11);
    expect(roundSteps({ ...plan, steps: coherent, slowing: slow }, 10).map((s) => s.seconds)).toEqual([6.5, 6.5]);
  });

  it('walks every step boundary in order, and looks each one up', () => {
    const plan = sessionPlan(box, { minutes: 3 }, { inhale: 6, exhale: 8 });
    const all = planBoundaries(plan, 0, plan.durationMs);
    expect(all[0]).toMatchObject({ atMs: 0, round: 0, index: 0 });
    for (let i = 1; i < all.length; i++) expect(all[i].atMs).toBeGreaterThan(all[i - 1].atMs);
    for (const b of all) {
      const at = planStepAt(plan, b.atMs);
      expect(at).toMatchObject({ round: b.round, index: b.index, startMs: b.atMs, elapsedMs: 0 });
      expect(at.durationMs).toBe(Math.round(b.step.seconds * 1000));
    }
    const last = all[all.length - 1];
    expect(last.atMs + Math.round(last.step.seconds * 1000)).toBe(plan.durationMs);
    // From the middle, it starts at the next boundary.
    const from = all[10].atMs + 1;
    expect(planBoundaries(plan, from, plan.durationMs)[0].atMs).toBe(all[11].atMs);
  });

  it('runs a session to completion and counts rounds when ended early', () => {
    const plans = [sessionPlan(coherent, { minutes: 1 }, slow)];
    const state = settle();
    if (state.status !== 'active') throw new Error('settle');
    const end = LEAD_MS + plans[0].durationMs;
    expect(readPosition(plans, state.segment, end).done).toBe(true);
    expect(readPosition(plans, state.segment, end - 1).done).toBe(false);
    const done = complete(plans, state);
    expect(done).toMatchObject({ status: 'finished', parts: [{ completedRounds: plans[0].rounds, activeMs: plans[0].durationMs }] });

    const roundFour = plans[0].roundStartsMs![3];
    const paused = pause(plans, state, LEAD_MS + roundFour + 500, 'user');
    expect(endEarly(plans, paused)).toMatchObject({ parts: [{ completedRounds: 3, activeMs: roundFour + 500 }] });
  });

  it('schedules one cue per slowed step, ending with the completion cue', () => {
    const plan = sessionPlan(coherent, { minutes: 1 }, slow);
    const { cues, endMs } = buildSchedule(plan, 0, { mode: 'tones', toneSet: 'wood', haptics: null }, () => undefined);
    expect(cues).toHaveLength(plan.rounds * 2 + 1);
    expect(cues[cues.length - 1].atMs).toBe(endMs);
    expect(cues[cues.length - 2].atMs).toBe(endMs - 6500);
  });

  it('accepts only a slowing that lengthens the breath, within bounds, where it is offered', () => {
    expect(isValidSlowing(coherent, slow)).toBe(true);
    expect(isValidSlowing(coherent, { inhale: 5.5, exhale: 5.5 })).toBe(false);
    expect(isValidSlowing(coherent, { inhale: 5, exhale: 6 })).toBe(false);
    expect(isValidSlowing(coherent, { inhale: 21, exhale: 6 })).toBe(false);
    expect(isValidSlowing(coherent, { inhale: 6.25, exhale: 6 })).toBe(false);
    expect(checkSlowing('coherent', coherent, slow)).toEqual(slow);
    expect(checkSlowing(null, box, { inhale: 5, exhale: 5 })).toEqual({ inhale: 5, exhale: 5 });
    expect(checkSlowing('sama-vritti', box, { inhale: 5, exhale: 5 })).toBe(false);
    expect(checkSlowing('coherent', coherent, null)).toBeNull();
  });
});
