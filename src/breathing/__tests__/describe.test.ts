import { LIBRARY } from '../../content/library';
import { progressLine, rhythmLine, slowingLine } from '../describe';

const steps = (id: string) => LIBRARY.find((t) => t.id === id)!.practice.steps;

describe('progress line', () => {
  it('shows time remaining for a practice set in minutes', () => {
    expect(progressLine({ minutes: 5 }, { roundNumber: 3, roundsLeft: 13, remainingMs: 226_000 })).toBe('3:46 remaining');
  });

  it('shows the round for a practice set in rounds', () => {
    expect(progressLine({ rounds: 4 }, { roundNumber: 2, roundsLeft: 3, remainingMs: 57_000 })).toBe('Round 2 of 4');
    expect(progressLine({ rounds: 4 }, { roundNumber: 4, roundsLeft: 1, remainingMs: 19_000 })).toBe('Round 4 of 4');
  });
});

describe('rhythm line', () => {
  it('names each step with a capital, leaving out steps that are off', () => {
    expect(rhythmLine(steps('sama-vritti'))).toBe('In 4 · Hold 4 · Out 4 · Rest 4');
    expect(rhythmLine(steps('visama-vritti'))).toBe('In 4 · Out 6');
    expect(rhythmLine(steps('4-7-8'))).toBe('In 4 · Hold 7 · Out 8');
  });

  it('says each side once, and uses the cue words', () => {
    expect(rhythmLine(steps('nadi-shodhana'))).toBe('In 4 · Out 6, each side');
    expect(rhythmLine(steps('bhramari'))).toBe('In 4 · Hum 8');
    expect(rhythmLine(steps('udgeeth'))).toBe('In 4 · Om 8');
    expect(rhythmLine(steps('cyclic-sighing'))).toBe('In 3 · Top up 1 · Out 6');
  });

  it('keeps half seconds, and describes a slowing', () => {
    expect(rhythmLine(steps('coherent'))).toBe('In 5.5 · Out 5.5');
    expect(slowingLine(steps('coherent'), { inhale: 6.5, exhale: 6.5 })).toBe('Slows to In 6.5 · Out 6.5, a little each round');
  });
});
