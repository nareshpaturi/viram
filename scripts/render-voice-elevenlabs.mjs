// Generates the Viram voice with ElevenLabs (delivery plan D23; PRD “AI voice requirements”).
// Needs ELEVENLABS_API_KEY from a paid plan, so the clips carry a commercial licence, and macOS afconvert.
//
//   npm run audio:voice-design                      Designs candidate voices from BRIEFS into voice-design/.
//   npm run audio:voice-design -- --save <id>       Adds a chosen preview to your ElevenLabs voices; prints its voice ID.
//   ELEVENLABS_VOICE_ID=<id> npm run audio:voice    Renders every clip into assets/voice/viram/ with the lexicon.
//
// To offer it in the app, add `viram` (or the folder named by VIRAM_VOICE) to src/audio/voices.ts.
//
// Add `-- --missing` to the render to generate only clips that don't exist yet.
// Masters stay in voice-masters/ and the settings in docs/content/voice-generation.json:
// keep both with the release evidence. Then run `npm run audio:manifest`, which fails on any
// cue over its limit, and flip PLACEHOLDER_VOICE only after the listener gate passes.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { LIBRARY } from '../src/content/library.ts';
import { CUES } from '../src/content/voice.ts';
import { writeVoiceClip } from './lib/wav.mjs';

const API = 'https://api.elevenlabs.io/v1';
const KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID;
const MODEL = process.env.ELEVENLABS_MODEL ?? 'eleven_multilingual_v2';
const LEXICON = 'docs/content/viram-lexicon.pls';
const SETTINGS = 'docs/content/voice-generation.json';
const OUT = join('assets/voice', process.env.VIRAM_VOICE ?? 'viram');
const MASTERS = 'voice-masters';
const DESIGNS = 'voice-design';

// Voice Design briefs: a calm pranayama teacher in Indian English, described in words and never cloned from a real person.
const BRIEFS = {
  'teacher-female':
    'A calm, warm Indian woman in her forties who teaches pranayama. She speaks clear Indian English, softly and slowly, with gentle pauses. Reassuring and unhurried, close to the microphone in a quiet room.',
  'teacher-male':
    'A calm, grounded Indian man in his forties who teaches pranayama. He speaks clear Indian English in a low, soft voice, slowly and steadily. Kind and unhurried, close to the microphone in a quiet room.',
};

// Cue words are generated as if they follow this line (it isn't spoken), so they sound like
// a teacher's calm instruction rather than a word read out of a list.
const CUE_CONTEXT = 'Let the breath be slow and easy.';
const VOICE_SETTINGS = { stability: 0.6, similarity_boost: 0.8, style: 0.1, use_speaker_boost: true };
// Speed keeps cue words inside their maxSeconds; counts fit a one-second slot.
const SPEED = { cue: 1.0, count: 1.1, name: 0.9, intro: 0.9 };
const INTRO_PAUSE = ' <break time="0.6s" /> ';
const SEED = 108;
const OUTPUT_FORMAT = 'wav_48000';

const args = process.argv.slice(2);
const onlyMissing = args.includes('--missing');

async function api(path, init = {}) {
  if (!KEY) throw new Error('Set ELEVENLABS_API_KEY from a paid ElevenLabs plan.');
  const json = typeof init.body === 'string' ? { 'content-type': 'application/json' } : {};
  const res = await fetch(`${API}${path}`, { ...init, headers: { 'xi-api-key': KEY, ...json } });
  if (!res.ok) throw new Error(`${init.method ?? 'GET'} ${path}: ${res.status} ${await res.text()}`);
  return res;
}
const post = (path, body) => api(path, { method: 'POST', body: body instanceof FormData ? body : JSON.stringify(body) });

async function design() {
  mkdirSync(DESIGNS, { recursive: true });
  const intro = LIBRARY.find((t) => t.id === 'sama-vritti').guidance.introduction.lines;
  const text = [...intro, 'Inhale. Hold. Exhale. Rest.'].join(' ');
  const previews = [];
  for (const [brief, voice_description] of Object.entries(BRIEFS)) {
    const res = await post('/text-to-voice/design', { voice_description, text, seed: SEED, output_format: 'mp3_44100_128' });
    for (const [i, preview] of (await res.json()).previews.entries()) {
      const file = join(DESIGNS, `${brief}-${i + 1}.mp3`);
      writeFileSync(file, Buffer.from(preview.audio_base_64, 'base64'));
      previews.push({ brief, file, generated_voice_id: preview.generated_voice_id });
    }
  }
  writeFileSync(join(DESIGNS, 'previews.json'), JSON.stringify(previews, null, 2));
  for (const p of previews) console.log(`${p.file}  ${p.generated_voice_id}`);
  console.log('Listen, then save the one you like: npm run audio:voice-design -- --save <generated_voice_id>');
}

async function save(generatedId) {
  const previews = JSON.parse(readFileSync(join(DESIGNS, 'previews.json'), 'utf8'));
  const chosen = previews.find((p) => p.generated_voice_id === generatedId);
  if (!chosen) throw new Error(`${generatedId} isn't in ${DESIGNS}/previews.json`);
  const others = previews.filter((p) => p !== chosen).map((p) => p.generated_voice_id);
  const res = await post('/text-to-voice', {
    voice_name: 'Viram',
    voice_description: BRIEFS[chosen.brief],
    generated_voice_id: generatedId,
    played_not_selected_voice_ids: others,
  });
  console.log(`Saved. Render with: ELEVENLABS_VOICE_ID=${(await res.json()).voice_id} npm run audio:voice`);
}

async function render() {
  if (!VOICE_ID) throw new Error('Set ELEVENLABS_VOICE_ID (from --save, or any voice in your ElevenLabs library).');
  mkdirSync(MASTERS, { recursive: true });
  mkdirSync(OUT, { recursive: true });
  const lexicon = readFileSync(LEXICON);
  const form = new FormData();
  form.append('name', 'Viram lexicon');
  form.append('file', new Blob([lexicon]), 'viram-lexicon.pls');
  const dictionary = await (await post('/pronunciation-dictionaries/add-from-file', form)).json();
  const locator = { pronunciation_dictionary_id: dictionary.id, version_id: dictionary.version_id };

  async function speak(id, text, kind) {
    // Introductions are long, so they are stored compressed.
    const file = join(OUT, `${id}.${kind === 'intro' ? 'm4a' : 'wav'}`);
    if (onlyMissing && existsSync(file)) return;
    const body = {
      text,
      model_id: MODEL,
      seed: SEED,
      voice_settings: { ...VOICE_SETTINGS, speed: SPEED[kind] },
      pronunciation_dictionary_locators: [locator],
      ...(kind === 'cue' || kind === 'count' ? { previous_text: CUE_CONTEXT } : {}),
    };
    const res = await post(`/text-to-speech/${VOICE_ID}?output_format=${OUTPUT_FORMAT}`, body);
    const master = join(MASTERS, `${id}.wav`);
    writeFileSync(master, Buffer.from(await res.arrayBuffer()));
    writeVoiceClip(master, file);
    console.log(`${id}`);
  }

  for (const [id, cue] of Object.entries(CUES)) await speak(id, cue.text, id.startsWith('count-') ? 'count' : 'cue');
  for (const technique of LIBRARY) {
    const { introduction } = technique.guidance;
    await speak(introduction.clip, introduction.lines.join(INTRO_PAUSE), 'intro');
    if (introduction.long) await speak(introduction.long.clip, introduction.long.lines.join(INTRO_PAUSE), 'intro');
    // The lexicon turns each name into its respelling.
    if (technique.pronunciation) await speak(technique.pronunciation.clip, technique.name, 'name');
  }

  const settings = {
    generatedAt: new Date().toISOString(),
    voiceId: VOICE_ID,
    model: MODEL,
    outputFormat: OUTPUT_FORMAT,
    seed: SEED,
    voiceSettings: VOICE_SETTINGS,
    speed: SPEED,
    cueContext: CUE_CONTEXT,
    introPause: INTRO_PAUSE.trim(),
    lexicon: { file: LEXICON, sha256: createHash('sha256').update(lexicon).digest('hex'), dictionary: locator },
  };
  writeFileSync(SETTINGS, `${JSON.stringify(settings, null, 2)}\n`);
  console.log(`Rendered into ${OUT}/ and recorded ${SETTINGS}. Next: npm run audio:manifest`);
}

const [mode] = args;
const saveAt = args.indexOf('--save');
await (mode === 'design' ? (saveAt >= 0 ? save(args[saveAt + 1]) : design()) : mode === 'render' ? render() : Promise.reject(new Error('Mode: design or render')));
