import { DEFAULT_HAPTIC_PHASES, hapticPattern, phasesLine } from '../patterns';

describe('haptic patterns', () => {
  it('marks each phase with a different rhythm or length, not just strength', () => {
    const shape = (kind: 'inhale' | 'hold' | 'exhale' | 'rest') => hapticPattern(kind, 4000, 'marks', 'strong').map((p) => [p.atMs, p.ms]);
    expect(shape('inhale')).toEqual([
      [0, 22],
      [90, 30],
    ]);
    expect(shape('exhale')).toEqual([[0, 320]]);
    expect(shape('hold')).toEqual([[0, 18]]);
    // The exhale is the emphasis: the longest vibration of any step.
    expect(Math.max(...hapticPattern('exhale', 4000, 'marks', 'medium').map((p) => p.ms))).toBeGreaterThan(200);
  });

  it('taps through the inhale and exhale, stopping before the next step', () => {
    const inhale = hapticPattern('inhale', 4000, 'through', 'strong');
    expect(inhale.length).toBeGreaterThan(5);
    expect(inhale.every((p) => p.atMs + p.ms <= 4000 - 350)).toBe(true);
    // Growing through the inhale, fading through the exhale.
    expect(inhale[inhale.length - 1].amplitude).toBeGreaterThan(inhale[2].amplitude);
    const exhale = hapticPattern('exhale', 6000, 'through', 'strong');
    expect(exhale[0].ms).toBe(320);
    expect(exhale.slice(1).every((p, i, all) => i === 0 || p.amplitude <= all[i - 1].amplitude)).toBe(true);
  });

  it('keeps short steps to their mark', () => {
    expect(hapticPattern('inhale', 800, 'through', 'medium')).toHaveLength(2);
    expect(hapticPattern('hold', 0, 'marks', 'medium')).toEqual([]);
  });

  it('scales strength and honours phases that are off', () => {
    expect(hapticPattern('hold', 4000, 'marks', 'light')[0].amplitude).toBeLessThan(hapticPattern('hold', 4000, 'marks', 'strong')[0].amplitude);
    expect(hapticPattern('exhale', 4000, 'marks', 'medium', { ...DEFAULT_HAPTIC_PHASES, exhale: false })).toEqual([]);
  });

  it('summarises the phases', () => {
    expect(phasesLine(DEFAULT_HAPTIC_PHASES)).toBe('Every step');
    expect(phasesLine({ inhale: true, hold: false, exhale: true, rest: false })).toBe('Inhale, exhale');
  });
});
