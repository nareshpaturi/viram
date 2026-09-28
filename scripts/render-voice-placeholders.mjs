// Renders PLACEHOLDER voice clips with the macOS `say` voice so voice
// guidance can be built and tested before the licensed Viram voice exists
// (delivery plan D14). Not for release: D23 replaces every file in
// assets/voice/ with approved clips generated from docs/content/viram-lexicon.pls.
// Run on a Mac with `npm run audio:voice-placeholders` (add `-- --missing` for new clips only).
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LIBRARY } from '../src/content/library.ts';
import { CUES } from '../src/content/voice.ts';
import { readWav, writeWav } from './lib/wav.mjs';

const VOICE = process.env.VIRAM_TTS_VOICE ?? 'Samantha';
const OUT = 'assets/voice';
const work = mkdtempSync(join(tmpdir(), 'viram-voice-'));
// `--missing` renders only clips that don't exist yet, leaving the rest untouched.
const onlyMissing = process.argv.includes('--missing');

/** Speaks `text`, trims silence, and writes a 44.1 kHz mono WAV. */
function speak(id, text, rate) {
  if (onlyMissing && existsSync(join(OUT, `${id}.wav`))) return;
  const aiff = join(work, `${id}.aiff`);
  const wav = join(work, `${id}.wav`);
  execFileSync('say', ['-v', VOICE, '-r', String(rate), '-o', aiff, text]);
  execFileSync('afconvert', ['-f', 'WAVE', '-d', 'LEI16@44100', '-c', '1', aiff, wav]);
  const { samples } = readWav(wav);
  const loud = (x) => Math.abs(x) > 0.01;
  const start = Math.max(0, samples.findIndex(loud) - 441);
  const end = Math.min(samples.length, samples.length - [...samples].reverse().findIndex(loud) + 2205);
  writeWav(join(OUT, `${id}.wav`), samples.subarray(start, end));
}

mkdirSync(OUT, { recursive: true });
// Counts are brisker so each fits its one-second slot.
for (const [id, cue] of Object.entries(CUES)) speak(id, cue.text, id.startsWith('count-') ? 230 : cue.text.includes(' ') ? 210 : 180);
for (const technique of LIBRARY) {
  speak(technique.guidance.introduction.clip, technique.guidance.introduction.lines.join(' [[slnc 500]] '), 150);
  const long = technique.guidance.introduction.long;
  if (long) speak(long.clip, long.lines.join(' [[slnc 500]] '), 150);
  if (technique.pronunciation) {
    const sayable = technique.pronunciation.respelling.toLowerCase().replace(/-/g, '');
    speak(technique.pronunciation.clip, sayable, 150);
  }
}
rmSync(work, { recursive: true, force: true });
console.log(`Rendered placeholder clips with the “${VOICE}” voice into ${OUT}/. Not for release.`);
