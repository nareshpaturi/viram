// Builds the short samples first use plays, so people can hear Voice and Bells
// before choosing (FR-13): each voice says “Inhale … Exhale”, and each tone
// set plays its inhale and exhale sounds the same distance apart. They are
// made from the bundled clips, so run this after the voices or tones change:
// `npm run audio:samples`.
import { TONE_SETS } from '../src/audio/toneSets.ts';
import { VOICE_IDS } from '../src/audio/voices.ts';
import { SAMPLE_RATE, readWav, writeWav } from './lib/wav.mjs';

/** Seconds from the inhale cue to the exhale cue: a short, unhurried breath. */
const BREATH = 2.5;

function sample(dir) {
  const inhale = readWav(`${dir}/inhale.wav`).samples;
  const exhale = readWav(`${dir}/exhale.wav`).samples;
  const at = Math.round(BREATH * SAMPLE_RATE);
  const mix = new Float32Array(Math.max(inhale.length, at + exhale.length));
  mix.set(inhale);
  for (let i = 0; i < exhale.length; i++) mix[at + i] += exhale[i];
  writeWav(`${dir}/sample.wav`, mix);
}

for (const voice of VOICE_IDS) sample(`assets/voice/${voice}`);
for (const set of TONE_SETS) sample(`assets/tones/${set}`);
console.log(`Wrote samples for ${VOICE_IDS.length} voices and ${TONE_SETS.length} tone sets.`);
