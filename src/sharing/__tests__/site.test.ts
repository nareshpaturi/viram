/// <reference types="node" />
import { LIBRARY } from '../../content/library';
import { describeRhythm } from '../../breathing/describe';
import { decodeShareLink, encodeShareLink, type SharedRhythm } from '../link';
// The viram.app fallback page's decoder, plain JS for the browser.
import { decodePayload, describeSteps } from '../../../site/share/decode.js';

const payloadOf = (link: string) => link.split('/r/')[1];

const samples: SharedRhythm[] = [
  ...LIBRARY.map((t) => ({
    name: `Class · ${t.name}`,
    steps: t.practice.steps.map(({ caption: _c, ...s }) => s),
    target: t.practice.target,
    techniqueId: t.id,
  })),
  {
    name: 'शाम का अभ्यास',
    steps: [
      { kind: 'inhale', seconds: 4 },
      { kind: 'hold', seconds: 0 },
      { kind: 'exhale', seconds: 6 },
      { kind: 'rest', seconds: 2 },
    ],
    target: { rounds: 27 },
    techniqueId: null,
  },
];

describe('viram.app decoder agrees with the app', () => {
  it.each(samples.map((s) => [s.name, s] as const))('%s', (_name, rhythm) => {
    const payload = payloadOf(encodeShareLink(rhythm));
    const app = decodeShareLink(payload);
    const web = decodePayload(payload);
    if (!app.ok) throw new Error('app rejected a valid link');
    expect(web).not.toBeNull();
    expect(web!.name).toBe(app.rhythm.name);
    expect(web!.target).toEqual(app.rhythm.target);
    expect(web!.steps.map((s: { seconds: number }) => s.seconds)).toEqual(app.rhythm.steps.map((s) => s.seconds));
    expect(describeSteps(web!.steps)).toBe(describeRhythm(app.rhythm.steps));
  });

  it('accepts and rejects exactly the same fuzzed links', () => {
    let seed = 11;
    const random = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
    const valid = samples.map((s) => payloadOf(encodeShareLink(s)));
    const alphabet = Array.from('ihreLR0123456789._-~<>%abcXYZ\u0000é');
    let accepted = 0;
    for (let n = 0; n < 5000; n++) {
      let text = valid[Math.floor(random() * valid.length)];
      const at = Math.floor(random() * text.length);
      const op = random();
      if (op < 0.5) text = text.slice(0, at) + alphabet[Math.floor(random() * alphabet.length)] + text.slice(at + 1);
      else if (op < 0.75) text = text.slice(0, at);
      else text = text.slice(0, at) + text.slice(at + 2);
      const app = decodeShareLink(text);
      const web = decodePayload(text);
      expect(web !== null).toBe(app.ok);
      if (app.ok) {
        accepted += 1;
        expect(web!.name).toBe(app.rhythm.name);
      }
    }
    expect(accepted).toBeGreaterThan(0);
  });
});
