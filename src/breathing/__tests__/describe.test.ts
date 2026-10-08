import { LIBRARY } from '../../content/library';
import { rhythmLine, slowingLine } from '../describe';

const steps = (id: string) => LIBRARY.find((t) => t.id === id)!.practice.steps;

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
