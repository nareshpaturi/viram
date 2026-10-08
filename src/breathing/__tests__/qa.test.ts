/** Schedule and summary regressions from the QA reports of 2026-10-08. */
import { describeTargetAndPlan } from '../describe';
import { countCues } from '../timeline';

const steps = [
  { kind: 'inhale' as const, seconds: 4 },
  { kind: 'hold' as const, seconds: 4 },
  { kind: 'exhale' as const, seconds: 4 },
  { kind: 'rest' as const, seconds: 4 },
];

describe('counting within longer holds (QA F06)', () => {
  const clip = () => 400;
  it('counts a step up to 20 seconds', () => {
    expect(countCues({ kind: 'hold', seconds: 20 }, 0, null, clip)).toHaveLength(19);
  });

  it('doesn’t count a longer step at all, rather than stopping at 20', () => {
    expect(countCues({ kind: 'hold', seconds: 60 }, 0, null, clip)).toEqual([]);
  });
});

describe('the save summary agrees with Adjust rhythm (QA AQ-07)', () => {
  it('includes gradual slowing in the plan', () => {
    const slowing = { inhale: 5, exhale: 5 };
    expect(describeTargetAndPlan(steps, { minutes: 5 })).toBe('5 min · 19 rounds · 5:04');
    expect(describeTargetAndPlan(steps, { minutes: 5 }, slowing)).toBe('5 min · 18 rounds · 5:06');
  });
});
