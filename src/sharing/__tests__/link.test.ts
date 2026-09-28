/// <reference types="node" />
import { LIBRARY } from '../../content/library';
import { isValidSeconds, isValidTarget } from '../../breathing/rhythm';
import { cleanName, decodeShareLink, encodeShareLink, findTechnique, type SharedRhythm } from '../link';

const fromTechnique = (id: string, name = findTechnique(id)!.name): SharedRhythm => {
  const { steps, target } = findTechnique(id)!.practice;
  return {
    name,
    steps: steps.map(({ kind, seconds, side, route, cue }) =>
      Object.fromEntries(Object.entries({ kind, seconds, side, route, cue }).filter(([, v]) => v !== undefined)) as never,
    ),
    target,
    techniqueId: id,
  };
};
const custom: SharedRhythm = {
  name: 'Evening 4-4-6-4',
  steps: [
    { kind: 'inhale', seconds: 4 },
    { kind: 'hold', seconds: 4 },
    { kind: 'exhale', seconds: 6 },
    { kind: 'rest', seconds: 0 },
  ],
  target: { rounds: 21 },
  techniqueId: null,
};
const LENGTH_BUDGET = 160;

describe('share links', () => {
  it.each(LIBRARY.map((t) => t.id))('round-trips %s exactly', (id) => {
    const rhythm = fromTechnique(id, 'Sunday class');
    const link = encodeShareLink(rhythm);
    expect(link.startsWith('https://viram.app/r/1_')).toBe(true);
    expect(link.length).toBeLessThanOrEqual(LENGTH_BUDGET);
    expect(decodeShareLink(link)).toEqual({ ok: true, rhythm });
  });

  it('round-trips a custom rhythm and non-ASCII names', () => {
    expect(decodeShareLink(encodeShareLink(custom))).toEqual({ ok: true, rhythm: custom });
    const hindi = { ...custom, name: 'शाम का अभ्यास 🌙' };
    expect(decodeShareLink(encodeShareLink(hindi))).toEqual({ ok: true, rhythm: hindi });
  });

  it('accepts the app scheme and a bare payload', () => {
    const payload = encodeShareLink(custom).split('/r/')[1];
    expect(decodeShareLink(`viram://r/${payload}`).ok).toBe(true);
    expect(decodeShareLink(payload).ok).toBe(true);
    expect(decodeShareLink(`https://viram.app/r/${payload}?utm_source=x`).ok).toBe(true);
  });

  it('keeps route and hum from the installed library, not the link', () => {
    const result = decodeShareLink(encodeShareLink(fromTechnique('sheetali')));
    expect(result.ok && result.rhythm.steps[0].route).toBe('mouth');
    const hum = decodeShareLink(encodeShareLink(fromTechnique('bhramari')));
    expect(hum.ok && hum.rhythm.steps[1].cue).toBe('hum');
  });

  it.each([
    ['unknown version', '2_ _m5_i4-h4-e4-r4_QQ'],
    ['unknown technique', '1_kapalabhati_m5_i4-e6_QQ'],
    ['minutes not offered', '1__m7_i4-h4-e4-r4_QQ'],
    ['rounds over 108', '1__r109_i4-h4-e4-r4_QQ'],
    ['rounds zero', '1__r0_i4-h4-e4-r4_QQ'],
    ['inhale over 20', '1__m5_i21-h4-e4-r4_QQ'],
    ['inhale 0', '1__m5_i0-h4-e4-r4_QQ'],
    ['half seconds on custom', '1__m5_i4.5-h4-e4-r4_QQ'],
    ['five custom steps', '1__m5_i4-h4-e4-r4-r4_QQ'],
    ['custom out of order', '1__m5_h4-i4-e4-r4_QQ'],
    ['sides on custom', '1__m5_i4L-h4-e4-r4_QQ'],
    ['wrong structure for technique', '1_nadi-shodhana_m5_i4L-e6R_QQ'],
    ['wrong side for technique', '1_nadi-shodhana_m5_i4R-e6R-i4R-e6L_QQ'],
    ['half seconds where not allowed', '1_nadi-shodhana_m5_i4.5L-e6R-i4R-e6L_QQ'],
    ['empty name', '1__m5_i4-h4-e4-r4_'],
    ['bad base64', '1__m5_i4-h4-e4-r4_Q'],
    ['markup name', `1__m5_i4-h4-e4-r4_${Buffer.from('<script>alert(1)</script>').toString('base64url')}`],
    ['link in name', `1__m5_i4-h4-e4-r4_${Buffer.from('see https://x.io').toString('base64url')}`],
    ['name over 40', `1__m5_i4-h4-e4-r4_${Buffer.from('x'.repeat(41)).toString('base64url')}`],
    ['control characters', `1__m5_i4-h4-e4-r4_${Buffer.from('a\u0000b').toString('base64url')}`],
    ['invalid UTF-8', `1__m5_i4-h4-e4-r4_${Buffer.from([0xc3, 0x28]).toString('base64url')}`],
    ['truncated', '1__m5_i4-h4'],
    ['oversized', `1__m5_i4-h4-e4-r4_${'Q'.repeat(500)}`],
    ['not a string', 42],
    ['empty', ''],
  ])('rejects %s', (_label, input) => {
    expect(decodeShareLink(input)).toEqual({ ok: false });
  });

  it('cleans names to plain text', () => {
    expect(cleanName('  Sunday   class ')).toBe('Sunday class');
    expect(cleanName('a<b')).toBeNull();
    expect(cleanName('')).toBeNull();
    expect(cleanName('x'.repeat(40))).toHaveLength(40);
  });

  it('never crashes or accepts out-of-bounds input across 10,000 fuzzed links', () => {
    let seed = 7;
    const random = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
    const pick = <T,>(items: readonly T[]): T => items[Math.floor(random() * items.length)];
    const valid = [...LIBRARY.map((t) => encodeShareLink(fromTechnique(t.id))), encodeShareLink(custom)];
    const alphabet = 'ihreLR0123456789._-~%<>/:?#&=+ abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ\u0000é🌙';
    for (let n = 0; n < 10_000; n++) {
      let text = pick(valid);
      const edits = 1 + Math.floor(random() * 4);
      for (let e = 0; e < edits; e++) {
        const at = Math.floor(random() * text.length);
        const op = random();
        if (op < 0.4) text = text.slice(0, at) + pick(Array.from(alphabet)) + text.slice(at + 1);
        else if (op < 0.6) text = text.slice(0, at);
        else if (op < 0.8) text = text.slice(0, at) + pick(Array.from(alphabet)).repeat(1 + Math.floor(random() * 30)) + text.slice(at);
        else text = text.slice(0, at) + text.slice(at + 1 + Math.floor(random() * 5));
      }
      const result = decodeShareLink(text);
      if (!result.ok) continue;
      const { rhythm } = result;
      expect(isValidTarget(rhythm.target)).toBe(true);
      expect(cleanName(rhythm.name)).toBe(rhythm.name);
      const increment = rhythm.techniqueId ? findTechnique(rhythm.techniqueId)!.practice.increment : 1;
      for (const step of rhythm.steps) expect(isValidSeconds(step.kind, step.seconds, increment)).toBe(true);
    }
  });
});
