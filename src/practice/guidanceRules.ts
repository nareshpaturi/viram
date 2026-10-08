/**
 * Two small rules the practice screen and the settings share, so what the
 * copy says is always what the practice does (UX05, UX06).
 */
import type { PauseReason } from '../breathing/session';
import type { CueMode } from '../breathing/timeline';
import type { SilentLocked } from '../settings/preferences';

/**
 * What keeps guiding once the phone is locked. Voice and Tones always do.
 * Silent has nothing to play: Android can still tap, iPhone can't (iOS
 * allows haptics only in the foreground), so there it pauses, or carries
 * soft tones heard only while locked if the practitioner chose them.
 */
export type LockBehavior = 'voice' | 'tones' | 'haptics' | 'softTones' | 'pauses';

export function lockBehavior(input: { mode: CueMode; haptics: boolean; silentLocked: SilentLocked; platform: string }): LockBehavior {
  if (input.mode === 'voice') return 'voice';
  if (input.mode === 'tones') return 'tones';
  if (input.platform === 'ios') return input.silentLocked === 'tones' ? 'softTones' : 'pauses';
  return input.haptics ? 'haptics' : 'pauses';
}

/** Cues & sound: what each mode does, including when the phone locks. */
export const MODE_HELP: Record<LockBehavior, string> = {
  voice: 'Voice says each step, like “Inhale left.” It keeps guiding when you lock your phone.',
  tones: 'A different sound marks each step. The tones keep guiding when you lock your phone.',
  haptics: 'No sound. The screen stays on. If you lock your phone, haptic taps keep guiding.',
  softTones: 'No sound while you watch. The screen stays on. If you lock your phone, soft tones keep guiding.',
  pauses: 'No sound. The screen stays on, and locking your phone pauses the practice.',
};

/** The settle screen's one-time tip; none when locking pauses. */
export const LOCK_TIP: Record<LockBehavior, string | null> = {
  voice: 'You can lock your phone. The voice keeps guiding.',
  tones: 'You can lock your phone. The tones keep guiding.',
  haptics: 'You can lock your phone. Haptic taps keep guiding.',
  softTones: 'You can lock your phone. Soft tones keep guiding.',
  pauses: null,
};

/**
 * Who speaks during practice. With a screen reader on and Voice cues, the
 * Viram voice owns speech while the practice runs: step announcements would
 * talk over it. Pauses, the resume countdown, interruptions, and the finish
 * are still announced. With Tones or Silent, the screen reader announces
 * each step as before.
 */
export type SpeechOwner = 'viram' | 'screenReader';

export function speechOwner(input: { screenReader: boolean; mode: CueMode }): SpeechOwner {
  return input.screenReader && input.mode === 'voice' ? 'viram' : 'screenReader';
}

/** The settle screen's line when the Viram voice owns speech. */
export const screenReaderNote = (platform: string) =>
  `The Viram voice guides each step. ${platform === 'android' ? 'TalkBack' : 'VoiceOver'} stays quiet until you pause.`;

/** Shown and announced when a practice pauses, by reason. */
export const PAUSE_TITLE: Record<PauseReason, string> = {
  user: 'Take your time.',
  call: 'Paused for a call.',
  audio: 'Paused for other audio.',
  headphones: 'Paused: headphones disconnected.',
  lockScreen: 'Paused from the lock screen.',
  locked: 'Paused when your phone locked.',
};

/** Breathe's Guidance row: “Voice and haptic taps”, “Tones, no haptics”, “Haptic taps only”. */
export function guidanceLine(mode: CueMode, haptics: boolean): string {
  if (mode === 'silent') return haptics ? 'Haptic taps only' : 'Silent, no haptics';
  const name = mode === 'voice' ? 'Voice' : 'Tones';
  return haptics ? `${name} and haptic taps` : `${name}, no haptics`;
}
