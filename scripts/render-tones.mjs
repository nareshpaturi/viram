// Renders the three tone sets. Each has distinct inhale, hold, exhale, and
// rest sounds plus a completion sound, all in Sa = C♯ like the music beds, so
// a cue always sits in tune with the music. Inhale rises to Pa, exhale settles
// on Sa, and hold and rest are softer touches. Run with `npm run audio:tones`.
import { mkdirSync } from 'node:fs';
import { addPartial, fade, hall, lowpass, note, peak, scale, seconds } from './lib/synth.mjs';
import { writeWav } from './lib/wav.mjs';

// Pitches in semitones from Sa (C♯3).
const PITCH = { inhale: 19, hold: 24, exhale: 12, rest: 7 };
const SOFT = { inhale: 1, hold: 0.55, exhale: 1, rest: 0.45 };

/** An instrument from its partials: [ratio, gain, decay seconds, beat hertz]. */
function strike(partials) {
  return (out, at, freq, gain) => {
    for (const [ratio, partGain, decay, beat = 0] of partials) {
      // Paired partials a few hertz apart beat slowly, like a real bowl or bar.
      for (const offset of beat ? [-beat / 2, beat / 2] : [0]) {
        addPartial(out, at, { freq: freq * ratio + offset, gain: (gain * partGain) / (beat ? 2 : 1), decay, attack: 0.006 });
      }
    }
  };
}

// Soft bells: a singing bowl struck gently, with its slow shimmer.
const bowl = strike([[1, 1, 2.8, 0.9], [2.71, 0.45, 1.4, 2.2], [5.03, 0.18, 0.7, 3.5], [7.9, 0.07, 0.35, 5]]);
// Wood: a soft rosewood marimba bar.
const marimba = strike([[1, 1, 0.55], [3.99, 0.22, 0.14], [9.9, 0.05, 0.05]]);
// Chimes: a tubular chime, struck lightly.
const chime = strike([[1, 1, 1.6, 0.6], [2.76, 0.4, 0.8, 1.4], [5.4, 0.16, 0.4], [8.93, 0.06, 0.2]]);

const SETS = {
  'soft-bells': { voice: bowl, octave: 0, length: 3.2, complete: 6, cutoff: 7000, space: { wet: 0.22, feedback: 0.88, damping: 0.4 } },
  wood: { voice: marimba, octave: 0, length: 1.4, complete: 3, cutoff: 5000, space: { wet: 0.2, feedback: 0.84, damping: 0.45 } },
  chimes: { voice: chime, octave: 12, length: 2.4, complete: 5, cutoff: 6000, space: { wet: 0.28, feedback: 0.9, damping: 0.45 } },
};

function render(set, length, strikes) {
  const out = new Float32Array(seconds(length));
  for (const [at, semitones, gain] of strikes) set.voice(out, seconds(at), note(semitones + set.octave), gain);
  return fade(hall(lowpass(out, set.cutoff), set.space), 0.002, Math.min(0.8, length / 3));
}

for (const [name, set] of Object.entries(SETS)) {
  const sounds = Object.fromEntries(Object.keys(PITCH).map((kind) => [kind, render(set, set.length, [[0, PITCH[kind], SOFT[kind]]])]));
  // Completion: Sa, Pa, upper Sa, unhurried.
  sounds.complete = render(set, set.complete, [[0, 12, 0.8], [0.55, 19, 0.75], [1.1, 24, 0.7]]);
  // One gain per set keeps hold and rest softer than inhale and exhale, and tones level with the voice.
  const gain = 0.35 / Math.max(...Object.values(sounds).map(peak));
  mkdirSync(`assets/tones/${name}`, { recursive: true });
  for (const [kind, samples] of Object.entries(sounds)) writeWav(`assets/tones/${name}/${kind}.wav`, scale(samples, gain));
}
console.log('Rendered the Soft bells, Wood, and Chimes tone sets.');
