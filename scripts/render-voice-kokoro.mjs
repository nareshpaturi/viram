// Generates the Viram voice locally with Kokoro (hexgrad/Kokoro-82M, Apache 2.0): the
// no-account alternative to scripts/render-voice-elevenlabs.mjs, with no API key or network.
//
// One-time setup, outside the repo (about 340 MB):
//   uv venv --python 3.12 ~/.viram-kokoro/.venv
//   uv pip install --python ~/.viram-kokoro/.venv/bin/python kokoro-onnx soundfile
//   Download kokoro-v1.0.onnx and voices-v1.0.bin into ~/.viram-kokoro from
//   https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.0
//
//   VIRAM_KOKORO_DIR=~/.viram-kokoro npm run audio:voice-kokoro
//
// Renders every voice in src/audio/voices.ts into assets/voice/<voice>/: cue words,
// counts, and names as WAV, introductions as AAC (.m4a). Options after `--`:
// `--voice af_bella` for one voice, `--only inhale,hold` to re-render some clips, `--missing`.
// Cue words that run over their maxSeconds are re-rendered a little faster until they fit.
// The settings are recorded in docs/content/voice-generation.json; keep it with the release
// evidence. Then run `npm run audio:manifest`, and flip PLACEHOLDER_VOICE only after the
// listener gate passes.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { VOICE_IDS } from '../src/audio/voices.ts';
import { LIBRARY } from '../src/content/library.ts';
import { HINDI_CUES, HINDI_INTROS } from '../src/content/hindi.ts';
import { CUES } from '../src/content/voice.ts';
import { durationMs, writeVoiceClip } from './lib/wav.mjs';

const DIR = process.env.VIRAM_KOKORO_DIR;
const PYTHON = process.env.VIRAM_KOKORO_PYTHON ?? (DIR && join(DIR, '.venv', 'bin', 'python'));
const SETTINGS = 'docs/content/voice-generation.json';

const args = process.argv.slice(2);
const option = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
const voices = option('--voice') ? [option('--voice')] : VOICE_IDS;
const only = option('--only')?.split(',');
const onlyMissing = args.includes('--missing');
// Hindi voices (ID ending in -hi) read the Hindi scripts with Hindi phonemes. British voices
// (bf_, bm_) read with British English phonemes; every other voice with American.
const hindi = (voice) => voice.endsWith('-hi');
const langOf = (voice) => (hindi(voice) ? 'hi' : voice.startsWith('b') ? 'en-gb' : 'en-us');
// A Hindi voice's folder is <kokoro voice>-hi; Kokoro itself knows only the speaker.
const kokoroVoice = (voice) => voice.replace(/-hi$/, '');

// Unhurried, like a teacher in a quiet room. Counts fit a one-second slot.
const SPEED = { cue: 0.9, count: 1.0, name: 0.85, intro: 0.88 };
const INTRO_PAUSE_MS = 700;
const MAX_TRIES = 5;

// Kokoro phonemes for each Sanskrit name, from the respellings and IPA targets in
// technique-research.md (Pronunciation). Spelled-out aliases put stress on every
// syllable and turn “Udgeeth” into “ood-jeet”, so names are given as phonemes.
// r is a tap (ɾ), as in Indian speech.
const NAMES = {
  Viram: 'viːɾˈɑːm',
  'Sama Vritti': 'sˈʌmə vɾˈɪtiː',
  'Visama Vritti': 'vˈɪʃəmə vɾˈɪtiː',
  'Nadi Shodhana': 'nˈɑːdi ʃˈoʊdənə',
  Bhramari: 'bɾˈɑːməɾi',
  Ujjayi: 'ʊdʒˈɑːjiː',
  Sheetali: 'ʃˈiːtəli',
  Dirgha: 'dˈiːɾɡə',
  Udgeeth: 'ʊdɡˈiːt',
  'Chandra Bhedana': 'tʃˈʌndɾə bˈeɪdənə',
  Om: 'ˈoʊm',
  pranayama: 'pɾɑːnɑːjˈɑːmə',
};

if (!DIR || !existsSync(join(DIR, 'kokoro-v1.0.onnx'))) {
  console.error('Set VIRAM_KOKORO_DIR to the folder with kokoro-v1.0.onnx and voices-v1.0.bin (see the setup at the top of this script).');
  process.exit(1);
}

// A full stop gives cue words a settled, falling close instead of a list-reading lilt.
// Introductions are long, so they are stored compressed.
/** Every clip a voice speaks, in its own language. Hindi lines come from src/content/hindi.ts. */
const clipsFor = (voice) => [
  ...Object.entries(CUES).map(([id, cue]) => ({
    id,
    file: `${id}.wav`,
    lines: [`${hindi(voice) ? HINDI_CUES[id] : cue.text}${hindi(voice) ? '।' : '.'}`],
    speed: id.startsWith('count-') ? SPEED.count : SPEED.cue,
    limitMs: cue.maxSeconds * 1000,
  })),
  ...LIBRARY.flatMap((technique) => {
    const { introduction } = technique.guidance;
    const translated = HINDI_INTROS[technique.id];
    const intros = [
      { clip: introduction.clip, lines: hindi(voice) ? translated.lines : introduction.lines },
      ...(introduction.long ? [{ clip: introduction.long.clip, lines: hindi(voice) ? translated.long : introduction.long.lines }] : []),
    ].map((intro) => ({
      id: intro.clip,
      file: `${intro.clip}.m4a`,
      lines: intro.lines,
      speed: SPEED.intro,
    }));
    if (!technique.pronunciation) return intros;
    if (!NAMES[technique.name]) throw new Error(`Add Kokoro phonemes for ${technique.name} to NAMES.`);
    // In Hindi the name is read from its Devanagari spelling.
    const name = hindi(voice) ? technique.pronunciation.devanagari : technique.name;
    return [...intros, { id: technique.pronunciation.clip, file: `${technique.pronunciation.clip}.wav`, lines: [name], speed: SPEED.name }];
  }),
].filter(({ id }) => !only || only.includes(id));

const work = mkdtempSync(join(tmpdir(), 'viram-kokoro-'));
const leftOver = [];

for (const voice of voices) {
  const out = join('assets/voice', voice);
  mkdirSync(out, { recursive: true });
  let pending = clipsFor(voice).filter((clip) => !(onlyMissing && existsSync(join(out, clip.file))));
  for (let attempt = 0; pending.length && attempt < MAX_TRIES; attempt++) {
    const jobs = pending.map((clip) => ({
      out: join(work, `${clip.id}.wav`),
      lines: clip.lines,
      voice: kokoroVoice(voice),
      speed: clip.speed * 1.08 ** attempt,
      lang: langOf(voice),
      pauseMs: INTRO_PAUSE_MS,
      // English phonemes for the Sanskrit names; Hindi reads them from Devanagari.
      names: hindi(voice) ? {} : NAMES,
    }));
    execFileSync(PYTHON, ['scripts/lib/kokoro_tts.py'], { input: JSON.stringify(jobs), stdio: ['pipe', 'ignore', 'inherit'], env: { ...process.env, VIRAM_KOKORO_DIR: DIR } });
    pending = pending.filter((clip, i) => {
      const dest = join(out, clip.file);
      writeVoiceClip(jobs[i].out, dest);
      const ms = durationMs(dest);
      console.log(`${voice}/${clip.file}  ${ms} ms${attempt ? ` (speed ${jobs[i].speed.toFixed(2)})` : ''}`);
      return clip.limitMs !== undefined && ms > clip.limitMs;
    });
  }
  leftOver.push(...pending.map((clip) => `${voice}/${clip.id}`));
}
rmSync(work, { recursive: true, force: true });
if (leftOver.length) console.error(`Still over their limit: ${leftOver.join(', ')}`);

writeFileSync(
  SETTINGS,
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      generator: 'Kokoro-82M v1.0 (kokoro-onnx), scripts/render-voice-kokoro.mjs',
      voices: Object.fromEntries(VOICE_IDS.map((voice) => [voice, { lang: langOf(voice) }])),
      introFormat: 'AAC, 64 kbps, mono, 44.1 kHz (.m4a)',
      speed: SPEED,
      speedStepWhenOverLimit: 1.08,
      introPauseMs: INTRO_PAUSE_MS,
      names: NAMES,
    },
    null,
    2,
  )}\n`,
);
console.log(`Rendered ${clipsFor(voices[0]).length} clips each for ${voices.join(', ')} into assets/voice/ and recorded ${SETTINGS}. Next: npm run audio:manifest`);
