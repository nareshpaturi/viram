/**
 * Share links (FR-11 and the design review's share-link safety rules).
 *
 *   https://viram.app/r/1_<technique id>_<target>_<steps>_<name>
 *
 *   technique id  a library id, or empty for a custom rhythm
 *   target        m1 | m3 | m5 | m10, or r1 … r108
 *   steps         kind letter + seconds + optional side, joined by “-”:
 *                 i4L-e6R-i4R-e6L, i4-h4-e4-r4, i5.5-e5.5
 *   name          UTF-8 display name as unpadded base64url
 *
 * A link carries nothing else. Every field is validated and any failure
 * rejects the whole link. Instructions, captions, and safety text always come
 * from the installed library, never from the link.
 */
import { LIBRARY } from '../content/library';
import type { Technique } from '../content/types';
import {
  MINUTE_TARGETS,
  STEP_CUES,
  isValidSeconds,
  type StepCue,
  isValidTarget,
  type MinuteTarget,
  type RhythmStep,
  type StepKind,
  type Target,
} from '../breathing/rhythm';

export const LINK_ORIGIN = 'https://viram.app';
export const LINK_VERSION = '1';
export const MAX_NAME_LENGTH = 40;
/** Well above the longest valid link; anything longer is rejected unread. */
export const MAX_LINK_LENGTH = 400;

export interface SharedRhythm {
  name: string;
  steps: RhythmStep[];
  target: Target;
  techniqueId: string | null;
}

export type DecodeResult = { ok: true; rhythm: SharedRhythm } | { ok: false };

const KIND_CODE: Record<StepKind, string> = { inhale: 'i', hold: 'h', exhale: 'e', rest: 'r' };
const CODE_KIND: Record<string, StepKind> = { i: 'inhale', h: 'hold', e: 'exhale', r: 'rest' };
const CUSTOM_KINDS: readonly StepKind[] = ['inhale', 'hold', 'exhale', 'rest'];

// ——— Names ———

/** Plain text only: no control characters, markup, or links. Whitespace is collapsed. */
export function cleanName(raw: string): string | null {
  const name = raw.replace(/\s+/g, ' ').trim();
  const length = Array.from(name).length;
  if (length < 1 || length > MAX_NAME_LENGTH) return null;
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f-\u009f\u2028\u2029<>]/.test(name)) return null;
  if (/:\/\/|www\./i.test(name)) return null;
  return name;
}

// ——— UTF-8 base64url (Hermes has no reliable TextDecoder) ———

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

function utf8Encode(text: string): number[] {
  const bytes: number[] = [];
  for (const char of text) {
    const code = char.codePointAt(0)!;
    if (code < 0x80) bytes.push(code);
    else if (code < 0x800) bytes.push(0xc0 | (code >> 6), 0x80 | (code & 63));
    else if (code < 0x10000) bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 63), 0x80 | (code & 63));
    else bytes.push(0xf0 | (code >> 18), 0x80 | ((code >> 12) & 63), 0x80 | ((code >> 6) & 63), 0x80 | (code & 63));
  }
  return bytes;
}

function utf8Decode(bytes: number[]): string | null {
  let text = '';
  for (let i = 0; i < bytes.length; ) {
    const b = bytes[i];
    const extra = b < 0x80 ? 0 : b >> 5 === 6 ? 1 : b >> 4 === 14 ? 2 : b >> 3 === 30 ? 3 : -1;
    if (extra < 0) return null;
    let code = extra === 0 ? b : b & (0x3f >> extra);
    for (let k = 1; k <= extra; k++) {
      const next = bytes[i + k];
      if (next === undefined || next >> 6 !== 2) return null;
      code = (code << 6) | (next & 63);
    }
    const min = [0, 0x80, 0x800, 0x10000][extra];
    if (code < min || code > 0x10ffff || (code >= 0xd800 && code <= 0xdfff)) return null;
    text += String.fromCodePoint(code);
    i += extra + 1;
  }
  return text;
}

function base64urlEncode(bytes: number[]): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0);
    const chars = [B64[(n >> 18) & 63], B64[(n >> 12) & 63], B64[(n >> 6) & 63], B64[n & 63]];
    out += chars.slice(0, Math.min(4, bytes.length - i + 1)).join('');
  }
  return out;
}

function base64urlDecode(text: string): number[] | null {
  if (!/^[A-Za-z0-9_-]*$/.test(text) || text.length % 4 === 1) return null;
  const bytes: number[] = [];
  for (let i = 0; i < text.length; i += 4) {
    const chunk = text.slice(i, i + 4);
    const n = Array.from(chunk).reduce((acc, c, k) => acc | (B64.indexOf(c) << (18 - 6 * k)), 0);
    bytes.push((n >> 16) & 255);
    if (chunk.length > 2) bytes.push((n >> 8) & 255);
    if (chunk.length > 3) bytes.push(n & 255);
  }
  // Reject non-canonical encodings (stray bits in the last character).
  return base64urlEncode(bytes) === text ? bytes : null;
}

// ——— Validation shared with import ———

export function findTechnique(id: string): Technique | undefined {
  return LIBRARY.find((t) => t.id === id);
}

/**
 * Without a technique the steps must fit the custom builder: exactly
 * inhale, hold, exhale, rest in whole or half seconds. With one they must match that
 * installed, shareable technique's structure and sides, and its route and
 * cue come from the library.
 */
export function validateRhythm(input: SharedRhythm, options: { anyMinutes?: boolean } = {}): SharedRhythm | null {
  // Callers pass data from storage and files too, so check shapes first.
  if (typeof input.name !== 'string' || typeof input.target !== 'object' || input.target === null) return null;
  if (!Array.isArray(input.steps) || !input.steps.every(isStepShape)) return null;
  const name = cleanName(input.name);
  if (!name || !isValidTarget(input.target, options.anyMinutes)) return null;
  if (input.techniqueId === null) {
    const fits =
      input.steps.length === 4 &&
      input.steps.every(
        // v1.1: the custom builder offers half seconds (FR-01).
        (s, i) => s.kind === CUSTOM_KINDS[i] && !s.side && !s.route && !s.cue && isValidSeconds(s.kind, s.seconds, 0.5),
      );
    return fits ? { name, steps: input.steps.map(({ kind, seconds }) => ({ kind, seconds })), target: input.target, techniqueId: null } : null;
  }
  const technique = findTechnique(input.techniqueId);
  if (!technique || !technique.shareable || technique.riskTier !== 'gentle') return null;
  const reference = technique.practice.steps;
  if (input.steps.length !== reference.length) return null;
  const steps: RhythmStep[] = [];
  for (const [i, s] of input.steps.entries()) {
    const ref = reference[i];
    if (s.kind !== ref.kind || s.side !== ref.side) return null;
    if (!isValidSeconds(s.kind, s.seconds, technique.practice.increment)) return null;
    steps.push({ kind: ref.kind, seconds: s.seconds, side: ref.side, route: ref.route, cue: ref.cue });
  }
  return { name, steps: steps.map(stripUndefined), target: input.target, techniqueId: technique.id };
}

function isStepShape(step: unknown): step is RhythmStep {
  if (typeof step !== 'object' || step === null) return false;
  const s = step as Record<string, unknown>;
  return (
    typeof s.kind === 'string' &&
    s.kind in KIND_CODE &&
    typeof s.seconds === 'number' &&
    (s.side === undefined || s.side === 'left' || s.side === 'right') &&
    (s.route === undefined || s.route === 'mouth') &&
    (s.cue === undefined || STEP_CUES.includes(s.cue as StepCue))
  );
}

function stripUndefined(step: RhythmStep): RhythmStep {
  const out: RhythmStep = { kind: step.kind, seconds: step.seconds };
  if (step.side) out.side = step.side;
  if (step.route) out.route = step.route;
  if (step.cue) out.cue = step.cue;
  return out;
}

// ——— Encode / decode ———

export function encodeSharePayload(rhythm: SharedRhythm): string {
  const target = 'minutes' in rhythm.target ? `m${rhythm.target.minutes}` : `r${rhythm.target.rounds}`;
  const steps = rhythm.steps
    .map((s) => `${KIND_CODE[s.kind]}${s.seconds}${s.side === 'left' ? 'L' : s.side === 'right' ? 'R' : ''}`)
    .join('-');
  const name = base64urlEncode(utf8Encode(rhythm.name.replace(/\s+/g, ' ').trim()));
  return [LINK_VERSION, rhythm.techniqueId ?? '', target, steps, name].join('_');
}

export function encodeShareLink(rhythm: SharedRhythm): string {
  return `${LINK_ORIGIN}/r/${encodeSharePayload(rhythm)}`;
}

const STEP_PATTERN = /^([ihre])(\d{1,2}(?:\.5)?)([LR]?)$/;

function parseTarget(text: string): Target | null {
  const match = /^([mr])([1-9]\d{0,2})$/.exec(text);
  if (!match) return null;
  const value = Number(match[2]);
  if (match[1] === 'm') return MINUTE_TARGETS.includes(value as MinuteTarget) ? { minutes: value as MinuteTarget } : null;
  return { rounds: value };
}

function parseSteps(text: string): RhythmStep[] | null {
  const tokens = text.split('-');
  if (tokens.length < 2 || tokens.length > 8) return null;
  const steps: RhythmStep[] = [];
  for (const token of tokens) {
    const match = STEP_PATTERN.exec(token);
    if (!match) return null;
    const step: RhythmStep = { kind: CODE_KIND[match[1]], seconds: Number(match[2]) };
    if (match[3]) step.side = match[3] === 'L' ? 'left' : 'right';
    steps.push(step);
  }
  return steps;
}

/** Takes a full https or viram:// link, or the bare payload. Never throws. */
export function decodeShareLink(input: unknown): DecodeResult {
  try {
    if (typeof input !== 'string' || input.length === 0 || input.length > MAX_LINK_LENGTH) return { ok: false };
    const payload = input.replace(/^(?:https:\/\/(?:www\.)?viram\.app|viram:\/\/?)\/?r\//, '').replace(/[?#].*$/, '');
    const fields = payload.split('_');
    if (fields.length < 5 || fields[0] !== LINK_VERSION) return { ok: false };
    const [, techniqueId, targetText, stepsText] = fields;
    const nameText = fields.slice(4).join('_');
    if (techniqueId !== '' && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(techniqueId)) return { ok: false };
    const target = parseTarget(targetText);
    const steps = parseSteps(stepsText);
    const bytes = base64urlDecode(nameText);
    const name = bytes ? utf8Decode(bytes) : null;
    if (!target || !steps || name === null) return { ok: false };
    const rhythm = validateRhythm({ name, steps, target, techniqueId: techniqueId || null });
    return rhythm ? { ok: true, rhythm } : { ok: false };
  } catch {
    return { ok: false };
  }
}
