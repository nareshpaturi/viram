import { LIBRARY } from '../library';
import { techniqueTarget } from '../targets';
import { resolveSegment } from '../../routines/repository';
import { decodeShareLink, encodeShareLink, validateRhythm } from '../../sharing/link';

const technique = (id: string) => LIBRARY.find((t) => t.id === id)!;
const steps478 = (seconds: number[]) => technique('4-7-8').practice.steps.map((s, i) => ({ ...s, seconds: seconds[i] }));
const noRhythms = { get: () => null };

// The content review's probes (2026-10-08, F4 and F5).
describe('4-7-8 keeps its taught rounds everywhere it runs', () => {
  it('caps rounds at eight, and turns minutes into the taught four rounds', () => {
    const shared = (target: { rounds: number } | { minutes: number }) =>
      validateRhythm({ name: '4-7-8 breathing', steps: steps478([4, 7, 8, 0]), target, techniqueId: '4-7-8' })?.target;
    expect(shared({ rounds: 108 })).toEqual({ rounds: 8 });
    expect(shared({ minutes: 60 })).toEqual({ rounds: 4 });
    expect(shared({ rounds: 4 })).toEqual({ rounds: 4 });
  });

  it('runs four rounds in a routine, whatever minutes the segment holds', () => {
    const part = resolveSegment({ ref: { kind: 'technique', id: '4-7-8' }, minutes: 30 }, noRhythms);
    expect(part?.target).toEqual({ rounds: 4 });
  });

  it('leaves practices without a round limit alone', () => {
    expect(techniqueTarget(technique('sama-vritti'), { minutes: 30 })).toEqual({ minutes: 30 });
    expect(resolveSegment({ ref: { kind: 'technique', id: 'nadi-shodhana' }, minutes: 7 }, noRhythms)?.target).toEqual({ minutes: 7 });
  });

  it('accepts the easier ratio the guide describes: in 2, hold 3.5, out 4', () => {
    const easier = validateRhythm({ name: '4-7-8 breathing', steps: steps478([2, 3.5, 4, 0]), target: { rounds: 4 }, techniqueId: '4-7-8' });
    expect(easier?.steps.map((s) => s.seconds)).toEqual([2, 3.5, 4, 0]);
    const decoded = decodeShareLink(encodeShareLink(easier!));
    expect(decoded).toMatchObject({ ok: true });
    expect('rhythm' in decoded && decoded.rhythm.steps.map((s) => s.seconds)).toEqual([2, 3.5, 4, 0]);
  });
});
