import { COMFORT_LINE } from '../../content/safety';
import { LIBRARY } from '../../content/library';
import { cautionFor, HOLD_CAUTION } from '../caution';

const technique = (id: string) => LIBRARY.find((t) => t.id === id)!;
const withSeconds = (id: string, seconds: number[]) => ({ techniqueId: id, steps: technique(id).practice.steps.map((s, i) => ({ ...s, seconds: seconds[i] })) });

describe('the caution before a practice', () => {
  it('is the technique’s own short Take care', () => {
    expect(cautionFor({ techniqueId: 'sama-vritti', steps: technique('sama-vritti').practice.steps })).toBe(technique('sama-vritti').guidance.takeCareShort);
  });

  it('becomes the hold caution when holds are added to a hold-free practice', () => {
    expect(cautionFor(withSeconds('visama-vritti', [4, 3, 6, 0]))).toBe(HOLD_CAUTION);
  });

  it('covers custom rhythms, with or without holds', () => {
    const custom = (seconds: number[]) => ({ techniqueId: null, steps: (['inhale', 'hold', 'exhale', 'rest'] as const).map((kind, i) => ({ kind, seconds: seconds[i] })) });
    expect(cautionFor(custom([4, 4, 4, 4]))).toBe(HOLD_CAUTION);
    expect(cautionFor(custom([4, 0, 6, 0]))).toBe(COMFORT_LINE);
  });
});
