import type { RhythmStep } from '../../breathing/rhythm';
import { AIR, airAt, airFor, arrowHead, mirror, point, segment, slashFor, tangent, TRACE } from '../noseAir';
import { breathesThroughNose, drawingLabel, drawsInB, practiceNote, practiceVariant } from '../prototype';

const inhale = (extra: Partial<RhythmStep> = {}): RhythmStep => ({ kind: 'inhale', seconds: 4, ...extra });
const exhale = (extra: Partial<RhythmStep> = {}): RhythmStep => ({ kind: 'exhale', seconds: 6, ...extra });

describe('practiceVariant', () => {
  it('honors the setting only in development builds', () => {
    expect(practiceVariant('a', true)).toBe('a');
    expect(practiceVariant('b', false)).toBe('current');
    expect(practiceVariant(undefined, true)).toBe('current');
  });
});

describe('which steps draw', () => {
  it('keeps the guide in A for mouth breathing and Om', () => {
    expect(breathesThroughNose([inhale(), exhale()])).toBe(true);
    expect(breathesThroughNose([inhale({ route: 'mouth' }), exhale()])).toBe(false);
    expect(breathesThroughNose([inhale(), exhale({ cue: 'om' })])).toBe(false);
    expect(breathesThroughNose([inhale(), exhale({ cue: 'hum' })])).toBe(true);
  });

  it('draws in B only for a side or a hum', () => {
    expect(drawsInB(inhale({ side: 'left' }))).toBe(true);
    expect(drawsInB(exhale({ cue: 'hum' }))).toBe(true);
    expect(drawsInB(inhale())).toBe(false);
  });

  it('labels the drawing from the practitioner’s side', () => {
    expect(drawingLabel(inhale({ side: 'left' }))).toBe('Left open · Right closed');
    expect(drawingLabel(exhale({ side: 'right' }))).toBe('Right open · Left closed');
    expect(drawingLabel(exhale({ cue: 'hum' }))).toBe('Lips closed, humming');
    expect(drawingLabel(inhale())).toBeNull();
  });

  it('explains the mirror view for side practices, else shows the subtitle', () => {
    expect(practiceNote([inhale({ side: 'left' })], 'Alternate nostril breathing')).toBe('Mirror view: your left is on the left');
    expect(practiceNote([inhale()], 'Box breathing')).toBe('Box breathing');
  });
});

describe('the air', () => {
  it('runs from below the nose into the left nostril, mirrored for the right', () => {
    expect(point(AIR, 0)).toEqual(AIR[0]);
    expect(point(AIR, 1)).toEqual(AIR[3]);
    expect(mirror(AIR[3])).toEqual({ x: 164, y: 192 });
  });

  it('never puts the slash and the air in the same nostril', () => {
    for (const open of ['left', 'right'] as const) {
      const slash = slashFor(open);
      const slashX = (slash[0].x + slash[1].x) / 2;
      const nostrilX = airFor(open)[3].x;
      // The nose's midline is x = 150; mirror view puts the practitioner's left on the left.
      expect(Math.sign(slashX - 150)).toBe(-Math.sign(nostrilX - 150));
      expect(Math.sign(nostrilX - 150)).toBe(open === 'left' ? -1 : 1);
    }
  });

  it('draws the board’s slash, over the right nostril, for Inhale left', () => {
    expect(slashFor('left')).toEqual([
      { x: 156, y: 176 },
      { x: 169, y: 189 },
    ]);
  });

  it('splits the curve so its pieces meet it', () => {
    const piece = segment(AIR, 0.25, 0.75);
    const start = point(AIR, 0.25);
    const end = point(AIR, 0.75);
    expect(piece[0].x).toBeCloseTo(start.x);
    expect(piece[0].y).toBeCloseTo(start.y);
    expect(piece[3].x).toBeCloseTo(end.x);
    expect(piece[3].y).toBeCloseTo(end.y);
  });

  it('travels in on inhale and comes to rest at the nostril', () => {
    const start = airAt('inhale', 0)!;
    const end = airAt('inhale', 1)!;
    expect(start.inward).toBe(true);
    expect(start.head).toBeLessThan(end.head);
    expect(end).toEqual({ from: 1 - TRACE, to: 1, head: 1, inward: true });
  });

  it('leaves the nostril on exhale and travels out', () => {
    const start = airAt('exhale', 0)!;
    const end = airAt('exhale', 1)!;
    expect(start.inward).toBe(false);
    expect(start.head).toBeGreaterThan(end.head);
    expect(end.head).toBe(0);
    expect(end.to).toBeCloseTo(TRACE);
  });

  it('has no air on hold or rest, and a whole still arrow with reduced motion', () => {
    expect(airAt('hold', 0.5)).toBeNull();
    expect(airAt('rest', 0.5)).toBeNull();
    expect(airAt('exhale', 0.5, true)).toEqual({ from: 0, to: 1, head: 0, inward: false });
  });

  it('points the arrowhead along the travel', () => {
    // Into the left nostril: up and to the right, so both barbs sit below and left of the tip.
    const d = arrowHead(AIR[3], tangent(AIR, 1));
    const [lx, ly, tx, ty, rx, ry] = d.match(/-?[\d.]+/g)!.map(Number);
    expect([tx, ty]).toEqual([136, 192]);
    expect(lx).toBeLessThan(tx);
    expect(rx).toBeLessThan(tx);
    expect(ly).toBeGreaterThan(ty);
    expect(ry).toBeGreaterThan(ty);
  });
});
