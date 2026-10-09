// Renders the background music beds: a tanpura drone and a soft ambient pad,
// both in Sa = C♯ like the tone sets. Each is a seamless 48-second loop the
// native guide repeats under a practice. Generated here, so they carry no licence.
// Run with `npm run audio:music`.
import { mkdirSync } from 'node:fs';
import { addPartial, hall, highpass, levelLoudest, lowpass, note, random, seconds, wrapLoop } from './lib/synth.mjs';
import { SAMPLE_RATE, writeWav } from './lib/wav.mjs';

const LOOP = 48;
const TAIL = 24;
// Each bed's loudest moment at full music volume (BS.1770 momentary loudness).
// Cue words peak near −21 LUFS and the softer bells near −24 at the default cue
// volume, so the default 50% music volume (−40 LUFS) sits about 19 dB under the
// words and 16 under the bells, and even 100% stays 13 dB under the words.
const BED_LOUDEST_LUFS = -34;

/**
 * One tanpura pluck. Partials ring and fade, the low ones longest; the jawari
 * bridge adds a bright formant that sweeps down through the overtones after
 * each pluck, which gives the drone its shimmer.
 */
function pluck(out, at, freq, gain, rand) {
  const top = Math.min(70, Math.floor(7000 / freq));
  const formant = (t) => 600 + 2900 * Math.exp(-t / 1.2);
  for (let n = 1; n <= top; n++) {
    const f = n * freq * (1 + 1e-5 * n * n);
    const octaves = Math.log2(f);
    addPartial(out, at, {
      freq: f,
      gain: (gain / n ** 0.8) * (0.9 + 0.2 * rand()),
      decay: 7 / (1 + n / 10),
      attack: 0.004,
      length: seconds(9),
      // A gentle jawari: enough shimmer to sound like a tanpura, not a buzz that competes with the voice.
      envelope: (t) => 0.35 + 1.0 * Math.exp(-((octaves - Math.log2(formant(t))) ** 2) / (2 * 0.35 ** 2)),
    });
  }
}

function tanpura() {
  const rand = random(108);
  const out = new Float32Array(seconds(LOOP + TAIL));
  // Pa, Sa, Sa, low Sa: the traditional order, with a breath after the low Sa.
  const strings = [
    { freq: note(-5), gain: 0.8, at: 0 },
    { freq: note(0), gain: 1, at: 1.3 },
    { freq: note(0) + 0.25, gain: 1, at: 2.6 },
    { freq: note(-12), gain: 1.1, at: 3.9 },
  ];
  for (let cycle = 0; cycle < LOOP / 6; cycle++) {
    for (const string of strings) {
      const jitter = (rand() - 0.5) * 0.06;
      pluck(out, seconds(cycle * 6 + string.at + jitter + 0.03), string.freq, string.gain * (0.92 + 0.16 * rand()), rand);
    }
  }
  return finish(lowpass(highpass(out, 45), 3500), { wet: 0.35, feedback: 0.92, damping: 0.3 });
}

/** A warm note: soft harmonics, three slightly detuned copies, and a slow swell. Notes cross-fade over their 4-second edges. */
function padNote(out, start, length, freq, gain, rand) {
  const rate = 0.07 + 0.06 * rand();
  const phase = rand() * 2 * Math.PI;
  const attack = 4;
  const envelope = (t) => {
    const edge = Math.min(1, t / attack, (length - t) / attack);
    // A shallow swell, so the pad never surges up into the cues.
    const swell = 0.88 + 0.12 * Math.sin(2 * Math.PI * rate * t + phase);
    return edge <= 0 ? 0 : (0.5 - 0.5 * Math.cos(Math.PI * edge)) * swell;
  };
  for (const cents of [-5, 0, 5]) {
    for (let h = 1; h <= 10; h++) {
      addPartial(out, start, { freq: freq * h * 2 ** (cents / 1200), gain: gain / 3 / h ** 1.35, attack: 0, length: seconds(length), envelope });
    }
  }
}

function pad() {
  const rand = random(27);
  const out = new Float32Array(seconds(LOOP + TAIL));
  // I – IV – vi – V(sus), open voicings in semitones from Sa; the sus chord leads back to I.
  const chords = [
    [-12, 0, 7, 14, 16],
    [-7, 0, 5, 9, 14],
    [-3, 4, 7, 12, 14],
    [-5, 2, 7, 12, 14],
  ];
  const span = LOOP / chords.length;
  chords.forEach((chord, i) => {
    // Each chord fades in two seconds before its turn and out two seconds after.
    const start = (i * span - 2 + LOOP) % LOOP;
    chord.forEach((semitones, j) => padNote(out, seconds(start), span + 4, note(semitones), j === 0 ? 0.8 : 0.6, rand));
  });
  return finish(lowpass(highpass(out, 45), 2200), { wet: 0.45, feedback: 0.93, damping: 0.4 });
}

function finish(dry, space) {
  return levelLoudest(wrapLoop(hall(dry, space), seconds(LOOP)), BED_LOUDEST_LUFS);
}

mkdirSync('assets/music', { recursive: true });
for (const [name, render] of Object.entries({ tanpura, pad })) {
  const samples = render();
  writeWav(`assets/music/${name}.wav`, samples);
  console.log(`assets/music/${name}.wav  ${(samples.length / SAMPLE_RATE).toFixed(1)} s`);
}
