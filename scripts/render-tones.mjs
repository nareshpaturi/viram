// Renders the Wood and Chimes tone sets (Soft bells are the prototype's
// tones). Each set has distinct inhale, hold, exhale, and rest sounds plus a
// completion sound. Placeholders until the sound-design lane delivers.
// Run with `npm run audio:tones`.
import { mkdirSync } from 'node:fs';
import { SAMPLE_RATE, writeWav } from './lib/wav.mjs';

function render(seconds, voice) {
  const samples = new Float32Array(Math.round(seconds * SAMPLE_RATE));
  for (let i = 0; i < samples.length; i++) samples[i] = voice(i / SAMPLE_RATE);
  // Gentle 5 ms fade-in and 20 ms fade-out so no sound clicks.
  const fadeIn = 0.005 * SAMPLE_RATE;
  const fadeOut = 0.02 * SAMPLE_RATE;
  for (let i = 0; i < samples.length; i++) {
    samples[i] *= Math.min(1, i / fadeIn, (samples.length - i) / fadeOut);
  }
  return samples;
}

const partials = (f, list) => (t) =>
  list.reduce((sum, [ratio, gain, decay]) => sum + gain * Math.exp(-t / decay) * Math.sin(2 * Math.PI * f * ratio * t), 0);

// Wood: short, dry block strikes; hold and rest are softer double taps.
const block = (f, gain = 0.55) => partials(f, [[1, gain, 0.05], [2.76, gain * 0.35, 0.025], [5.4, gain * 0.15, 0.012]]);
const double = (f) => (t) => block(f, 0.4)(t) + (t > 0.14 ? block(f, 0.3)(t - 0.14) : 0);
const WOOD = {
  inhale: render(0.45, block(1046)),
  hold: render(0.5, double(880)),
  exhale: render(0.45, block(698)),
  rest: render(0.5, double(587)),
  complete: render(1.2, (t) => block(698, 0.4)(t) + (t > 0.18 ? block(880, 0.4)(t - 0.18) : 0) + (t > 0.36 ? block(1046, 0.45)(t - 0.36) : 0)),
};

// Chimes: bright, inharmonic tubular partials with a longer ring.
const tube = (f, gain = 0.32) => partials(f, [[1, gain, 0.5], [2.76, gain * 0.45, 0.28], [5.4, gain * 0.2, 0.14], [8.93, gain * 0.08, 0.07]]);
const CHIMES = {
  inhale: render(1.1, tube(784)),
  hold: render(1.0, tube(659, 0.26)),
  exhale: render(1.1, tube(523)),
  rest: render(1.0, tube(440, 0.24)),
  complete: render(1.8, (t) => tube(523, 0.22)(t) + (t > 0.25 ? tube(659, 0.22)(t - 0.25) : 0) + (t > 0.5 ? tube(784, 0.24)(t - 0.5) : 0)),
};

for (const [name, set] of Object.entries({ wood: WOOD, chimes: CHIMES })) {
  mkdirSync(`assets/tones/${name}`, { recursive: true });
  for (const [kind, samples] of Object.entries(set)) writeWav(`assets/tones/${name}/${kind}.wav`, samples);
}
console.log('Rendered Wood and Chimes tone sets.');
