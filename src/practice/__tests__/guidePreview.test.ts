import type { RhythmStep } from '../../breathing/rhythm';
import { LIBRARY } from '../../content/library';
import { DEFAULT_PREFERENCES } from '../../settings/preferences';
import { cycleMs, previewFrame, previewLength, previewProgress, previewReducer, type PreviewState } from '../guidePreview';
import { practiceSettings } from '../practiceSettings';

const steps = (id: string): RhythmStep[] => LIBRARY.find((t) => t.id === id)!.practice.steps;

describe('one preview cycle', () => {
  it('lasts one round of the current practice, from the library', () => {
    expect(cycleMs(steps('nadi-shodhana'))).toBe(20_000);
    expect(cycleMs(steps('bhramari'))).toBe(12_000);
    expect(cycleMs(steps('sama-vritti'))).toBe(16_000);
    expect(previewLength(steps('nadi-shodhana'))).toBe('20 sec · no sound');
  });

  it('walks Nadi Shodhana’s four steps in order, then ends', () => {
    const nadi = steps('nadi-shodhana');
    const at = (ms: number) => previewFrame(nadi, ms);
    expect(at(0)?.step).toMatchObject({ kind: 'inhale', side: 'left' });
    expect(at(4_000)?.step).toMatchObject({ kind: 'exhale', side: 'right' });
    expect(at(10_000)?.step).toMatchObject({ kind: 'inhale', side: 'right' });
    expect(at(19_999)?.step).toMatchObject({ kind: 'exhale', side: 'left' });
    expect(at(20_000)).toBeNull();
    expect(previewProgress(at(12_400)!)).toBe('Inhale right · 12 of 20 sec');
  });

  it('skips steps that are off, adding no holds', () => {
    const frames = [0, 4_000].map((ms) => previewFrame(steps('visama-vritti'), ms)!.step.kind);
    expect(frames).toEqual(['inhale', 'exhale']);
  });
});

describe('previews never overlap', () => {
  const toggle = (state: PreviewState, guide: 'circle' | 'illustrated', at: number) => previewReducer(state, { type: 'toggle', guide, at });

  it('starting one style’s preview stops the other’s', () => {
    const circle = toggle(null, 'circle', 0);
    const illustrated = toggle(circle, 'illustrated', 3_000);
    expect(illustrated).toEqual({ guide: 'illustrated', startedAt: 3_000 });
  });

  it('Preview on the style playing stops it', () => {
    expect(toggle(toggle(null, 'circle', 0), 'circle', 1_000)).toBeNull();
  });

  it('stops by itself after one cycle, and on stop', () => {
    const playing = toggle(null, 'illustrated', 1_000);
    expect(previewReducer(playing, { type: 'tick', at: 20_999, cycleMs: 20_000 })).toBe(playing);
    expect(previewReducer(playing, { type: 'tick', at: 21_000, cycleMs: 20_000 })).toBeNull();
    expect(previewReducer(playing, { type: 'stop' })).toBeNull();
  });
});

describe('changing the visual guide', () => {
  it('can’t change anything a practice runs with', () => {
    const circle = practiceSettings({ ...DEFAULT_PREFERENCES, visualGuide: 'circle' }, false, 'ios');
    const illustrated = practiceSettings({ ...DEFAULT_PREFERENCES, visualGuide: 'illustrated' }, false, 'ios');
    expect(illustrated).toEqual(circle);
  });
});
