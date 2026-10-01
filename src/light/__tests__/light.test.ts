import { orbRadius, orbShares } from '../../components/RhythmOrb';
import { LIBRARY } from '../../content/library';
import { angleLine, everydayWash, washAt, WASHES } from '../washes';

jest.mock('react-native-svg', () => ({}));

const at = (hour: number) => new Date(2026, 9, 1, hour, 30);

describe('Soft Light washes', () => {
  it('follows the local hour: dawn 6–11, day 11–17, dusk 17–21, night 21–6', () => {
    expect([5, 6, 10, 11, 16, 17, 20, 21, 23].map((h) => washAt(at(h)))).toEqual(['night', 'dawn', 'dawn', 'day', 'day', 'dusk', 'dusk', 'night', 'night']);
  });

  it('keeps dusk light on tab screens through the night for now', () => {
    expect(everydayWash(at(22))).toBe('dusk');
    expect(everydayWash(at(3))).toBe('dusk');
    expect(everydayWash(at(7))).toBe('dawn');
  });

  it('maps CSS gradient angles onto the unit box', () => {
    expect(angleLine(180)).toEqual({ x1: 0.5, y1: 0, x2: 0.5, y2: 1 });
    expect(angleLine(90)).toEqual({ x1: 0, y1: 0.5, x2: 1, y2: 0.5 });
    const day = angleLine(160);
    expect(day.y2).toBeGreaterThan(day.y1);
    expect(day.x2).toBeGreaterThan(day.x1);
  });

  it('uses only brand colors and their tints', () => {
    const brand = ['#A8CFD0', '#E4B84A', '#E46F51', '#D6ECDC'];
    for (const wash of Object.values(WASHES)) for (const glow of wash.glows) for (const stop of glow.stops) expect(brand).toContain(stop.color);
  });
});

describe('Rhythm orb', () => {
  const steps = (id: string) => LIBRARY.find((t) => t.id === id)!.practice.steps;

  it('sizes each kind by its share of the round, as the canvas draws it', () => {
    const box = orbShares(steps('sama-vritti'));
    expect(box).toEqual({ inhale: 0.25, hold: 0.25, exhale: 0.25, rest: 0.25 });
    expect(orbRadius(box.inhale!)).toBe(66);
    const visama = orbShares(steps('visama-vritti'));
    expect([orbRadius(visama.inhale!), orbRadius(visama.exhale!)]).toEqual([77, 91]);
    const bhramari = orbShares(steps('bhramari'));
    expect([orbRadius(bhramari.inhale!), orbRadius(bhramari.exhale!)]).toEqual([72, 96]);
  });

  it('leaves out kinds with no seconds, and adds sides together', () => {
    expect(orbShares(steps('visama-vritti')).hold).toBeUndefined();
    expect(orbShares(steps('nadi-shodhana'))).toEqual({ inhale: 0.4, exhale: 0.6 });
    expect(orbShares([])).toEqual({});
  });
});
