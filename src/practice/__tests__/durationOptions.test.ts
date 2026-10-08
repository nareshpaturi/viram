import { LIBRARY } from '../../content/library';
import { guidanceLine } from '../guidanceRules';
import { durationChoice, durationRow } from '../durationOptions';
import { practiceFromTechnique } from '../practice';

const practice = (id: string) => practiceFromTechnique(LIBRARY.find((t) => t.id === id)!);

describe('duration sheet', () => {
  it('offers the minute shortcuts with how long each really runs', () => {
    const choice = durationChoice(practice('sama-vritti'));
    expect(choice.question).toBe('How much space do you have?');
    expect(choice.options.map((o) => `${o.label} / ${o.detail}${o.selected ? ' ✓' : ''}`)).toEqual([
      '3 minutes / Runs 3:12',
      '5 minutes / Runs 5:04 ✓',
      '10 minutes / Runs 10:08',
      '20 minutes / Runs 20:00',
      '30 minutes / Runs 30:08',
    ]);
  });

  it('offers a practice taught in rounds its own counts and footnote', () => {
    const choice = durationChoice(practice('4-7-8'));
    expect(choice.question).toBe('How many rounds?');
    expect(choice.options.map((o) => `${o.label} / ${o.detail}`)).toEqual(['4 rounds / Runs 1:16 · as taught', '8 rounds / Runs 2:32 · after a month of regular practice']);
    expect(choice.options[0].selected).toBe(true);
    expect(choice.note).toBe('4-7-8 is taught in rounds. Start with 4, and build to 8 only when the hold feels easy.');
  });

  it('puts a target that isn’t on the list first, as your setting', () => {
    const choice = durationChoice({ ...practice('sama-vritti'), target: { minutes: 7 } });
    expect(choice.options[0]).toMatchObject({ label: '7 minutes', detail: 'Your setting', selected: true });
    expect(choice.options.filter((o) => o.selected)).toHaveLength(1);
  });

  it('says when the last round runs past the target', () => {
    expect(durationRow(practice('sama-vritti'))).toEqual({ value: '5 min', detail: 'Finishes the round at 5:04' });
    expect(durationRow(practice('nadi-shodhana'))).toEqual({ value: '5 min', detail: null });
    expect(durationRow(practice('4-7-8'))).toEqual({ value: '4 rounds', detail: 'Runs 1:16' });
  });
});

describe('guidance line', () => {
  it('sums up the cue mode and haptics', () => {
    expect(guidanceLine('voice', true)).toBe('Voice and haptic taps');
    expect(guidanceLine('tones', false)).toBe('Tones, no haptics');
    expect(guidanceLine('silent', true)).toBe('Haptic taps only');
  });
});
