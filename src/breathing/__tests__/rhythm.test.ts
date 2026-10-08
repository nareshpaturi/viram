import { LIBRARY } from '../../content/library';
import {
  boundaries,
  formatPace,
  isValidRhythm,
  isValidSeconds,
  isValidTarget,
  hasLongHolds,
  maxSeconds,
  nudgeSeconds,
  planFor,
  stepAt,
  type RhythmStep,
} from '../rhythm';
import { describePlan, describeRhythm, formatClock, guidedPace, perMinute } from '../describe';

const four = (i: number, h: number, e: number, r: number): RhythmStep[] => [
  { kind: 'inhale', seconds: i },
  { kind: 'hold', seconds: h },
  { kind: 'exhale', seconds: e },
  { kind: 'rest', seconds: r },
];
const technique = (id: string) => LIBRARY.find((t) => t.id === id)!.practice;

describe('planFor (PRD duration contract)', () => {
  it.each([
    ['box 4·4·4·4 at 5 min', four(4, 4, 4, 4), { minutes: 5 as const }, 19, '5:04', '3.8'],
    ['4·4·6·4 at 5 min', four(4, 4, 6, 4), { minutes: 5 as const }, 17, '5:06', '3.3'],
    ['4·0·6·0 for 21 rounds', four(4, 0, 6, 0), { rounds: 21 }, 21, '3:30', '6'],
    ['box for 21 rounds', four(4, 4, 4, 4), { rounds: 21 }, 21, '5:36', '3.8'],
  ])('%s', (_label, steps, target, rounds, clock, pace) => {
    const plan = planFor(steps, target);
    expect(plan.rounds).toBe(rounds);
    expect(formatClock(plan.durationMs)).toBe(clock);
    expect(formatPace(plan.breathsPerMinute)).toBe(pace);
  });

  it.each([
    ['sama-vritti', 19, '5:04', '3.8'],
    ['visama-vritti', 30, '5:00', '6'],
    ['nadi-shodhana', 15, '5:00', '6'],
    ['bhramari', 25, '5:00', '5'],
    ['ujjayi', 30, '5:00', '6'],
    ['sheetali', 18, '3:00', '6'],
    ['coherent', 28, '5:08', '5.5'],
    ['4-7-8', 4, '1:16', '3.2'],
  ])('library default %s', (id, rounds, clock, pace) => {
    const { steps, target } = technique(id);
    const plan = planFor(steps, target);
    expect(plan.rounds).toBe(rounds);
    expect(formatClock(plan.durationMs)).toBe(clock);
    expect(formatPace(plan.breathsPerMinute)).toBe(pace);
  });
});

describe('stepAt', () => {
  const nadi = technique('nadi-shodhana').steps;

  it('walks steps in order with sides', () => {
    expect(stepAt(nadi, 0)).toMatchObject({ round: 0, index: 0, startMs: 0, durationMs: 4000 });
    expect(stepAt(nadi, 4000)).toMatchObject({ round: 0, index: 1, startMs: 4000, durationMs: 6000 });
    expect(stepAt(nadi, 19_999)).toMatchObject({ round: 0, index: 3, elapsedMs: 5999 });
    expect(stepAt(nadi, 20_000)).toMatchObject({ round: 1, index: 0, startMs: 20_000 });
    expect(nadi.map((s) => s.side)).toEqual(['left', 'right', 'right', 'left']);
  });

  it('skips 0-second steps', () => {
    const steps = four(4, 0, 6, 0);
    expect(stepAt(steps, 3999).index).toBe(0);
    expect(stepAt(steps, 4000).index).toBe(2);
    expect(stepAt(steps, 10_000)).toMatchObject({ round: 1, index: 0 });
  });

  it('handles half-second steps', () => {
    const steps = technique('coherent').steps;
    expect(stepAt(steps, 5499).index).toBe(0);
    expect(stepAt(steps, 5500)).toMatchObject({ index: 1, startMs: 5500, durationMs: 5500 });
  });
});

describe('boundaries', () => {
  it('lists every non-zero boundary and never a 0-second step', () => {
    const list = boundaries(four(4, 0, 6, 0), 0, 20_000);
    expect(list.map((b) => [b.atMs, b.index, b.round])).toEqual([
      [0, 0, 0],
      [4000, 2, 0],
      [10_000, 0, 1],
      [14_000, 2, 1],
    ]);
  });

  it('starts from a step start mid-plan', () => {
    const list = boundaries(four(4, 4, 4, 4), 20_000, 32_000);
    expect(list.map((b) => b.atMs)).toEqual([20_000, 24_000, 28_000]);
    expect(list[0]).toMatchObject({ round: 1, index: 1 });
  });
});

describe('bounds (FR-01)', () => {
  it('accepts the documented ranges', () => {
    expect(isValidSeconds('inhale', 1, 1)).toBe(true);
    expect(isValidSeconds('exhale', 20, 1)).toBe(true);
    expect(isValidSeconds('hold', 0, 1)).toBe(true);
    expect(isValidSeconds('rest', 20, 1)).toBe(true);
    expect(isValidSeconds('inhale', 5.5, 0.5)).toBe(true);
  });

  it('rejects out-of-bounds and off-increment values', () => {
    expect(isValidSeconds('inhale', 0, 1)).toBe(false);
    expect(isValidSeconds('exhale', 21, 1)).toBe(false);
    expect(isValidSeconds('hold', -1, 1)).toBe(false);
    expect(isValidSeconds('hold', 21, 1)).toBe(false);
    expect(isValidSeconds('inhale', 5.5, 1)).toBe(false);
    expect(isValidSeconds('inhale', Number.NaN, 1)).toBe(false);
    expect(isValidRhythm([{ kind: 'hold', seconds: 4 }, { kind: 'rest', seconds: 4 }], 1)).toBe(false);
  });

  it('validates targets', () => {
    expect(isValidTarget({ minutes: 5 })).toBe(true);
    expect(isValidTarget({ minutes: 7 })).toBe(true);
    expect(isValidTarget({ minutes: 60 })).toBe(true);
    expect(isValidTarget({ minutes: 61 })).toBe(false);
    expect(isValidTarget({ minutes: 0 })).toBe(false);
    expect(isValidTarget({ minutes: 2.5 })).toBe(false);
    expect(isValidTarget({ rounds: 1 })).toBe(true);
    expect(isValidTarget({ rounds: 108 })).toBe(true);
    expect(isValidTarget({ rounds: 109 })).toBe(false);
    expect(isValidTarget({ rounds: 2.5 })).toBe(false);
  });

  it('nudges within bounds', () => {
    expect(nudgeSeconds('hold', 0, -1, 1)).toBe(0);
    expect(nudgeSeconds('inhale', 1, -1, 1)).toBe(1);
    expect(nudgeSeconds('exhale', 20, 1, 1)).toBe(20);
    expect(nudgeSeconds('inhale', 5.5, 1, 0.5)).toBe(6);
  });
});

describe('describeRhythm', () => {
  it.each([
    [four(4, 4, 4, 4), '4 · 4 · 4 · 4'],
    [four(4, 0, 6, 0), 'in 4 · out 6'],
    [four(4, 7, 8, 0), '4 · 7 · 8 · rest off'],
    [technique('nadi-shodhana').steps, 'in 4 · out 6, each side'],
    [technique('bhramari').steps, 'in 4 · hum 8'],
    [technique('coherent').steps, 'in 5.5 · out 5.5'],
  ])('%#', (steps, text) => expect(describeRhythm(steps)).toBe(text));

  it('describes the plan', () => {
    expect(describePlan(four(4, 4, 4, 4), { minutes: 5 })).toBe('19 rounds · 5:04');
  });
});

describe('v1.1 step cues', () => {
  it('counts a top-up as part of the breath before it: cyclic sighing is 6 guided breaths/min', () => {
    const plan = planFor(
      [
        { kind: 'inhale', seconds: 3 },
        { kind: 'inhale', seconds: 1, cue: 'top-up' },
        { kind: 'exhale', seconds: 6, route: 'mouth' },
      ],
      { minutes: 5 },
    );
    expect(plan).toMatchObject({ rounds: 30, durationMs: 300_000, breathsPerMinute: 6 });
  });
});

describe('pace labels', () => {
  it('keeps the pace and its unit on one line, and “guided” with them', () => {
    expect(perMinute('6')).toBe('6 breaths/⁠min');
    expect(guidedPace('5.5 → 4.6')).toBe('guided 5.5 → 4.6 breaths/⁠min');
    // Read without the joiners, it's the plain label.
    expect(guidedPace('6').replace(/ /g, ' ').replace(/⁠/g, '')).toBe('guided 6 breaths/min');
  });
});

describe('longer holds', () => {
  it('lets holds and rests reach 60 s only when asked, never inhales or exhales', () => {
    expect(isValidSeconds('hold', 40, 1)).toBe(false);
    expect(isValidSeconds('hold', 40, 1, true)).toBe(true);
    expect(isValidSeconds('rest', 60, 1, true)).toBe(true);
    expect(isValidSeconds('rest', 61, 1, true)).toBe(false);
    expect(isValidSeconds('inhale', 21, 1, true)).toBe(false);
    expect(maxSeconds('exhale', true)).toBe(20);
  });

  it('steps up to 60 with them on, and only down from a long hold with them off', () => {
    expect(nudgeSeconds('hold', 20, 1, 1)).toBe(20);
    expect(nudgeSeconds('hold', 20, 1, 1, true)).toBe(21);
    expect(nudgeSeconds('hold', 60, 1, 1, true)).toBe(60);
    expect(nudgeSeconds('hold', 40, 1, 1)).toBe(40);
    expect(nudgeSeconds('hold', 40, -1, 1)).toBe(39);
    expect(hasLongHolds([{ kind: 'inhale', seconds: 4 }, { kind: 'hold', seconds: 21 }])).toBe(true);
  });
});
