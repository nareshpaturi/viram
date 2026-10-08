// Small synthesis toolkit for the generated tones and music beds: additive
// voices, a mono Freeverb-style hall, seamless loops, and levels.
import { SAMPLE_RATE } from './wav.mjs';

/** Every tone and bed is in one key, Sa = C♯, so cues always sit in tune with the music. */
export const SA = 138.59; // C♯3
export const note = (semitones) => SA * 2 ** (semitones / 12);

export const seconds = (s) => Math.round(s * SAMPLE_RATE);

/** Deterministic noise, so a re-render produces the same files. */
export function random(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Envelopes are evaluated every 32 frames and interpolated between. */
const CONTROL = 32;

/**
 * Adds a decaying partial into `out` from frame `at`, shaped by an optional
 * `envelope(t)`. A rotating phasor stands in for Math.sin, which keeps long
 * renders quick.
 */
export function addPartial(out, at, { freq, gain, decay = Infinity, attack = 0.004, length = out.length - at, envelope }) {
  const w = (2 * Math.PI * freq) / SAMPLE_RATE;
  const cw = Math.cos(w);
  const sw = Math.sin(w);
  const fall = Math.exp(-1 / (decay * SAMPLE_RATE));
  const rise = attack * SAMPLE_RATE;
  let c = 1;
  let s = 0;
  let level = gain;
  let shape = 1;
  let step = 0;
  const end = Math.min(out.length, at + length);
  for (let n = 0; at + n < end; n++) {
    if (envelope && n % CONTROL === 0) {
      shape = envelope(n / SAMPLE_RATE);
      step = (envelope((n + CONTROL) / SAMPLE_RATE) - shape) / CONTROL;
    }
    out[at + n] += s * level * shape * (n < rise ? 0.5 - 0.5 * Math.cos((Math.PI * n) / rise) : 1);
    const next = c * cw - s * sw;
    s = s * cw + c * sw;
    c = next;
    level *= fall;
    shape += step;
  }
}

/** One-pole low-pass, in place. */
export function lowpass(samples, cutoff) {
  const a = Math.exp((-2 * Math.PI * cutoff) / SAMPLE_RATE);
  let y = 0;
  for (let i = 0; i < samples.length; i++) samples[i] = y = (1 - a) * samples[i] + a * y;
  return samples;
}

/** One-pole high-pass, in place: clears rumble below the music. */
export function highpass(samples, cutoff) {
  const a = Math.exp((-2 * Math.PI * cutoff) / SAMPLE_RATE);
  let x1 = 0;
  let y = 0;
  for (let i = 0; i < samples.length; i++) {
    const x = samples[i];
    samples[i] = y = a * (y + x - x1);
    x1 = x;
  }
  return samples;
}

/**
 * A soft hall: eight damped comb filters into four all-passes (Freeverb's
 * tunings). `feedback` sets the length of the tail; `damping` darkens it.
 */
export function hall(dry, { wet = 0.3, feedback = 0.9, damping = 0.35, preDelay = 0.02 } = {}) {
  const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617].map((n) => ({ buf: new Float32Array(n), i: 0, store: 0 }));
  const allpasses = [556, 441, 341, 225].map((n) => ({ buf: new Float32Array(n), i: 0 }));
  const pre = seconds(preDelay);
  const out = new Float32Array(dry.length);
  for (let n = 0; n < dry.length; n++) {
    const input = (n >= pre ? dry[n - pre] : 0) * 0.015;
    let acc = 0;
    for (const comb of combs) {
      const y = comb.buf[comb.i];
      comb.store = y * (1 - damping) + comb.store * damping;
      comb.buf[comb.i] = input + comb.store * feedback;
      if (++comb.i === comb.buf.length) comb.i = 0;
      acc += y;
    }
    for (const ap of allpasses) {
      const b = ap.buf[ap.i];
      ap.buf[ap.i] = acc + b * 0.5;
      acc = b - acc;
      if (++ap.i === ap.buf.length) ap.i = 0;
    }
    out[n] = dry[n] * (1 - wet) + acc * 3 * wet;
  }
  return out;
}

/**
 * Folds everything past `loopLength` back onto the start, so ringing notes
 * and the hall's tail carry across the loop point and the bed loops without a seam.
 */
export function wrapLoop(samples, loopLength) {
  const loop = samples.slice(0, loopLength);
  for (let i = loopLength; i < samples.length; i++) loop[(i - loopLength) % loopLength] += samples[i];
  return loop;
}

/** Fades the start and end so a one-shot sound never clicks. */
export function fade(samples, inSeconds, outSeconds) {
  const fadeIn = seconds(inSeconds);
  const fadeOut = seconds(outSeconds);
  for (let i = 0; i < samples.length; i++) {
    const out = samples.length - i;
    const gainIn = i < fadeIn ? i / fadeIn : 1;
    const gainOut = out < fadeOut ? 0.5 - 0.5 * Math.cos((Math.PI * out) / fadeOut) : 1;
    samples[i] *= gainIn * gainOut;
  }
  return samples;
}

export const rms = (samples) => Math.sqrt(samples.reduce((sum, x) => sum + x * x, 0) / samples.length);
export const peak = (samples) => samples.reduce((m, x) => Math.max(m, Math.abs(x)), 0);

/** Scales to an RMS level in dBFS, never past the peak ceiling. */
export function level(samples, rmsDb, ceiling = 0.7) {
  return scale(samples, Math.min(10 ** (rmsDb / 20) / rms(samples), ceiling / peak(samples)));
}

export function scale(samples, gain) {
  for (let i = 0; i < samples.length; i++) samples[i] *= gain;
  return samples;
}
