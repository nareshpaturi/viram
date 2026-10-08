/**
 * The voices a practitioner can choose. Each one speaks every cue, count,
 * name, and introduction. They are generated with Kokoro
 * (scripts/render-voice-kokoro.mjs) into assets/voice/<id>/; the IDs are
 * Kokoro's. One voice is used for a whole practice.
 *
 * Hindi voices (research gap 5) are the same Kokoro speakers reading the
 * Hindi scripts in src/content/hindi.ts; their IDs end in -hi.
 */
export const VOICES = {
  af_heart: { label: 'American 1', spoken: 'American English, female voice 1' },
  af_bella: { label: 'American 2', spoken: 'American English, female voice 2' },
  bf_emma: { label: 'British', spoken: 'British English, female voice' },
  hf_alpha: { label: 'Indian 1', spoken: 'Indian English, female voice 1' },
  hf_beta: { label: 'Indian 2', spoken: 'Indian English, female voice 2' },
  hm_psi: { label: 'Indian, male', spoken: 'Indian English, male voice' },
  'hf_alpha-hi': { label: 'Hindi', spoken: 'Hindi, female voice' },
  'hm_psi-hi': { label: 'Hindi, male', spoken: 'Hindi, male voice' },
} as const;

export type VoiceId = keyof typeof VOICES;
export const VOICE_IDS = Object.keys(VOICES) as VoiceId[];
export const DEFAULT_VOICE: VoiceId = 'af_heart';

export type VoiceLanguage = 'en' | 'hi';

/** The language a voice speaks; its introductions are captioned in it. */
export const voiceLanguage = (voice: VoiceId): VoiceLanguage => (voice.endsWith('-hi') ? 'hi' : 'en');

/** The native sound ID of one of a voice's clips, e.g. voice.af_heart.inhale. */
export const voiceSound = (voice: VoiceId, clip: string) => `voice.${voice}.${clip}`;

/** Choosing a voice in Settings plays the start of an introduction for this long. */
export const VOICE_PREVIEW_MS = 6000;
