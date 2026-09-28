// Decodes a Viram share link in the browser with the app's rules
// (src/sharing/link.ts). Returns null for anything invalid. Everything it
// returns is shown as plain text only. src/sharing/__tests__/site.test.ts
// checks this file against the app's codec.
import { TECHNIQUES } from './library.js';

const KINDS = { i: 'inhale', h: 'hold', e: 'exhale', r: 'rest' };
const CUSTOM = ['inhale', 'hold', 'exhale', 'rest'];
const MINUTES = [1, 3, 5, 10];
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

function base64url(text) {
  if (!/^[A-Za-z0-9_-]*$/.test(text) || text.length % 4 === 1) return null;
  const bytes = [];
  for (let i = 0; i < text.length; i += 4) {
    const chunk = text.slice(i, i + 4);
    let n = 0;
    for (let k = 0; k < chunk.length; k++) n |= B64.indexOf(chunk[k]) << (18 - 6 * k);
    bytes.push((n >> 16) & 255);
    if (chunk.length > 2) bytes.push((n >> 8) & 255);
    if (chunk.length > 3) bytes.push(n & 255);
  }
  // Reject non-canonical encodings, as the app does.
  let again = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0);
    again += [B64[(n >> 18) & 63], B64[(n >> 12) & 63], B64[(n >> 6) & 63], B64[n & 63]].slice(0, Math.min(4, bytes.length - i + 1)).join('');
  }
  return again === text ? new Uint8Array(bytes) : null;
}

function cleanName(raw) {
  const name = raw.replace(/\s+/g, ' ').trim();
  const length = Array.from(name).length;
  if (length < 1 || length > 40) return null;
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f-\u009f\u2028\u2029<>]/.test(name)) return null;
  if (/:\/\/|www\./i.test(name)) return null;
  return name;
}

const validSeconds = (kind, seconds, increment) =>
  Number.isFinite(seconds) && seconds >= (kind === 'inhale' || kind === 'exhale' ? 1 : 0) && seconds <= 20 && Number.isInteger(seconds / increment);

/** `payload` is everything after /r/. */
export function decodePayload(payload) {
  try {
    if (typeof payload !== 'string' || payload.length === 0 || payload.length > 400) return null;
    const fields = payload.split('_');
    if (fields.length < 5 || fields[0] !== '1') return null;
    const [, techniqueId, targetText, stepsText] = fields;
    if (techniqueId !== '' && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(techniqueId)) return null;

    const t = /^([mr])([1-9]\d{0,2})$/.exec(targetText);
    if (!t) return null;
    const value = Number(t[2]);
    const target = t[1] === 'm' ? (MINUTES.includes(value) ? { minutes: value } : null) : value <= 108 ? { rounds: value } : null;
    if (!target) return null;

    const tokens = stepsText.split('-');
    if (tokens.length < 2 || tokens.length > 8) return null;
    const steps = [];
    for (const token of tokens) {
      const m = /^([ihre])(\d{1,2}(?:\.5)?)([LR]?)$/.exec(token);
      if (!m) return null;
      steps.push({ kind: KINDS[m[1]], seconds: Number(m[2]), ...(m[3] ? { side: m[3] === 'L' ? 'left' : 'right' } : {}) });
    }

    const bytes = base64url(fields.slice(4).join('_'));
    if (!bytes) return null;
    const name = cleanName(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    if (!name) return null;

    if (techniqueId === '') {
      const fits = steps.length === 4 && steps.every((s, i) => s.kind === CUSTOM[i] && !s.side && validSeconds(s.kind, s.seconds, 1));
      return fits ? { name, steps, target, technique: null } : null;
    }
    const technique = TECHNIQUES[techniqueId];
    if (!technique || steps.length !== technique.steps.length) return null;
    for (const [i, s] of steps.entries()) {
      const ref = technique.steps[i];
      if (s.kind !== ref.kind || s.side !== ref.side || !validSeconds(s.kind, s.seconds, technique.increment)) return null;
      if (ref.cue) s.cue = ref.cue;
    }
    return { name, steps, target, technique: { id: techniqueId, name: technique.name, subtitle: technique.subtitle } };
  } catch {
    return null;
  }
}

/** “in 4 · out 6, each side”, “4 · 4 · 6 · 4”, “in 4 · hum 8”. */
export function describeSteps(steps) {
  const alternate =
    steps.length === 4 && steps[0].side && steps.every((s, i) => s.kind === ['inhale', 'exhale', 'inhale', 'exhale'][i]) &&
    steps[0].seconds === steps[2].seconds && steps[1].seconds === steps[3].seconds;
  if (alternate) return `in ${steps[0].seconds} · out ${steps[1].seconds}, each side`;
  const fourRow = steps.length === 4 && steps.every((s, i) => s.kind === CUSTOM[i] && !s.side);
  if (fourRow) {
    const [a, h, e, r] = steps;
    if (h.seconds === 0 && r.seconds === 0) return `in ${a.seconds} · out ${e.seconds}`;
    return [a.seconds, h.seconds || 'hold off', e.seconds, r.seconds || 'rest off'].join(' · ');
  }
  return steps
    .filter((s) => s.seconds > 0)
    .map((s) => `${s.cue === 'hum' ? 'hum' : s.kind === 'inhale' ? 'in' : s.kind === 'exhale' ? 'out' : s.kind} ${s.seconds}${s.side ? ` ${s.side}` : ''}`)
    .join(' · ');
}

export function describeTarget(target) {
  if ('minutes' in target) return `${target.minutes} min`;
  return `${target.rounds} ${target.rounds === 1 ? 'round' : 'rounds'}`;
}
