import { timeWithBreath } from '../format';

describe('timeWithBreath', () => {
  it('says seconds under a minute', () => {
    expect(timeWithBreath(1000)).toBe('1 second with your breath.');
    expect(timeWithBreath(42_400)).toBe('42 seconds with your breath.');
  });

  it('rounds to whole minutes from a minute up', () => {
    expect(timeWithBreath(59_600)).toBe('1 minute with your breath.');
    expect(timeWithBreath(304_000)).toBe('5 minutes with your breath.');
    expect(timeWithBreath(330_000)).toBe('6 minutes with your breath.');
  });
});
