/**
 * The practice screen's single guidance clock and cue player.
 *
 * With the native module, cues play on the audio clock and continue with the
 * screen locked. Without it (or if its audio fails to load), guidance falls
 * back to a JS clock with haptics only, so visual and haptic guidance always
 * continue (NFR-01).
 */
import { Asset } from 'expo-asset';
import * as Haptics from 'expo-haptics';
import NativeGuide, { type InterruptionReason, type RemoteCommand } from '../../modules/viram-guide';
import type { HapticStrength, SoundId } from '../breathing/timeline';
import type { Pulse } from '../haptics/patterns';
import { CUES } from '../content/voice';
import { CLIP_MS, SOUND_ASSETS } from './manifest.generated';
import { TIMING_LOG_ENABLED, recordCue } from './timingLog';
import { voiceSound, type VoiceId } from './voices';

// Development and internal builds report every cue's actual timing.
if (TIMING_LOG_ENABLED && NativeGuide) {
  NativeGuide.setTimingLog(true);
  NativeGuide.addListener('onCueTiming', recordCue);
}

export type { InterruptionReason, RemoteCommand };

/** A timeline segment, or an introduction clip played as a one-cue segment. */
export interface GuideSchedule {
  cues: { atMs: number; sound: string | null; haptic: HapticStrength | null; pulses?: Pulse[]; nowPlaying: string | null }[];
  endMs: number;
}

export interface SegmentOptions {
  volume: number;
  /** Play along with other audio (FR-03). */
  mixWithOthers: boolean;
  /** Automatic: play along only if other audio is already playing as the segment starts (iOS). */
  mixIfOthersPlaying?: boolean;
  /** While playing along, lower other audio briefly under each cue (Android). */
  lowerOthers?: boolean;
  title: string;
  subtitle: string;
  /** Music looped under the cues, or null. */
  bed: { sound: string; volume: number } | null;
  /** Speaks the schedule's voice clips. */
  voice: VoiceId;
}

export interface GuideHandlers {
  onInterruption(reason: InterruptionReason): void;
  onRemoteCommand(command: RemoteCommand): void;
  /** The native guide played the whole segment and released audio on its own. */
  onSegmentEnded(): void;
}

const HAPTIC_LEVEL: Record<HapticStrength, number> = { light: 1, medium: 2, strong: 3 };

const loaded = new Set<string>();
let audioBroken = false;

/** True when cues can be heard; false means visual and haptic guidance only. */
export function audioAvailable(): boolean {
  return NativeGuide !== null && !audioBroken;
}

/**
 * The timeline names voice clips without a voice (`voice.inhale`); the
 * chosen voice's clip plays (`voice.af_heart.inhale`).
 */
function inVoice(sound: string, voice: VoiceId): string {
  return sound.startsWith('voice.') ? voiceSound(voice, sound.slice('voice.'.length)) : sound;
}

/** Every sound a practice can use with these settings: one voice's cue clips, one tone set, and the music bed. */
export function practiceSounds(toneSet: string, bed: string | null, voice: VoiceId): string[] {
  const kinds = ['inhale', 'hold', 'exhale', 'rest', 'complete'];
  // Night practice always finishes on the soft bells (FR-23), whatever the tone set.
  const tones = new Set([...kinds.map((k) => `tone.${toneSet}.${k}`), 'tone.soft-bells.complete']);
  return [...tones, ...Object.keys(CUES).map((id) => voiceSound(voice, id)), ...(bed ? [bed] : [])];
}

/** Length of one of a voice's loaded clips, from the build-time manifest. */
export function clipLength(voice: VoiceId, clipId: string): number | undefined {
  return loaded.has(voiceSound(voice, clipId)) ? CLIP_MS[voice]?.[clipId] : undefined;
}

async function uriFor(id: SoundId | string): Promise<string | null> {
  const module = (SOUND_ASSETS as Record<string, number>)[id];
  if (module === undefined) return null;
  const asset = Asset.fromModule(module);
  await asset.downloadAsync();
  return asset.localUri ?? asset.uri;
}

/**
 * Loads sounds before a segment. A sound that fails to load is simply not
 * played: voice falls back to tones, and tones fall back to haptics.
 */
export async function prepareSounds(ids: readonly string[]): Promise<void> {
  if (!NativeGuide) return;
  const needed = ids.filter((id) => !loaded.has(id));
  const entries = await Promise.all(needed.map(async (id) => [id, await uriFor(id).catch(() => null)] as const));
  const sounds = Object.fromEntries(entries.filter((e): e is readonly [string, string] => e[1] !== null));
  try {
    const lengths = await NativeGuide.preload(sounds);
    Object.keys(lengths).forEach((id) => loaded.add(id));
  } catch {
    audioBroken = Object.keys(sounds).length > 0 && loaded.size === 0;
  }
}

// ——— JS fallback clock (no native audio) ———

let fallbackStart: number | null = null;
let fallbackFrozen: number | null = null;
let fallbackTimers: ReturnType<typeof setTimeout>[] = [];

const now = () => performance.now();

function hapticNow(level: number) {
  const style = [Haptics.ImpactFeedbackStyle.Light, Haptics.ImpactFeedbackStyle.Medium, Haptics.ImpactFeedbackStyle.Heavy][level - 1];
  if (style) Haptics.impactAsync(style).catch(() => undefined);
}

/** The nearest impact a JS-clock fallback can play for one pulse. */
const pulseLevel = (pulse: Pulse) => (pulse.amplitude < 0.45 ? 1 : pulse.amplitude < 0.8 ? 2 : 3);

/** [atMs, ms, amplitude, …] for the native engines. */
const flatPulses = (pulses: readonly Pulse[] | undefined) => (pulses ?? []).flatMap((p) => [p.atMs, p.ms, p.amplitude]);

function clearFallback() {
  fallbackTimers.forEach(clearTimeout);
  fallbackTimers = [];
}

// ——— Public API ———

export function startSegment(schedule: GuideSchedule, options: SegmentOptions): void {
  const { bed, voice, ...rest } = options;
  const cues = schedule.cues.map((cue) => {
    const sound = cue.sound && inVoice(cue.sound, voice);
    return {
      atMs: cue.atMs,
      sound: sound && loaded.has(sound) ? sound : null,
      haptic: cue.haptic ? HAPTIC_LEVEL[cue.haptic] : 0,
      pulses: flatPulses(cue.pulses),
      nowPlaying: cue.nowPlaying,
    };
  });
  if (audioAvailable()) {
    try {
      // A bed that failed to load is left out; the cues carry on without it.
      const playable = bed && loaded.has(bed.sound) ? bed : null;
      NativeGuide!.startSegment({
        cues,
        endMs: schedule.endMs,
        mixIfOthersPlaying: false,
        lowerOthers: false,
        ...rest,
        bed: playable?.sound ?? null,
        bedVolume: playable?.volume ?? 0,
      });
      return;
    } catch {
      audioBroken = true;
    }
  }
  clearFallback();
  fallbackStart = now();
  fallbackFrozen = null;
  fallbackTimers = schedule.cues.flatMap((c) =>
    c.pulses?.length
      ? c.pulses.map((p) => setTimeout(() => hapticNow(pulseLevel(p)), c.atMs + p.atMs))
      : c.haptic
        ? [setTimeout(() => hapticNow(HAPTIC_LEVEL[c.haptic!]), c.atMs)]
        : [],
  );
}

/** Clock position of the current segment in ms, or -1 when idle. */
export function positionMs(): number {
  if (audioAvailable()) return NativeGuide!.positionMs();
  if (fallbackStart === null) return -1;
  return fallbackFrozen ?? now() - fallbackStart;
}

export function pause(): number {
  if (audioAvailable()) return NativeGuide!.pause();
  clearFallback();
  if (fallbackStart === null) return -1;
  fallbackFrozen = now() - fallbackStart;
  return fallbackFrozen;
}

/** Lets the completion cue finish, then releases audio. */
export function finish(): void {
  if (audioAvailable()) NativeGuide!.finish();
  else stop();
}

export function stop(): void {
  if (NativeGuide) NativeGuide.stop();
  clearFallback();
  fallbackStart = null;
  fallbackFrozen = null;
}

export function setVolume(volume: number): void {
  if (audioAvailable()) NativeGuide!.setVolume(volume);
}

export function setNowPlaying(title: string, subtitle: string): void {
  if (audioAvailable()) NativeGuide!.setNowPlaying(title, subtitle);
}

/**
 * “Hear it” and “Hear a sample”; `maxMs` plays only the start, fading out (a
 * music preview). Resolves false when audio is unavailable.
 */
export async function playOnce(id: string, volume: number, maxMs?: number): Promise<boolean> {
  await prepareSounds([id]);
  if (!audioAvailable() || !loaded.has(id)) return false;
  try {
    NativeGuide!.playOnce(id, volume, maxMs);
    return true;
  } catch {
    return false;
  }
}

// ——— Previews (UX10): one at a time, stoppable, never started by choosing ———

let previewKey: string | null = null;
let previewToken = 0;
const previewListeners = new Set<() => void>();
const notifyPreview = () => previewListeners.forEach((listener) => listener());

function endPreview() {
  previewToken++;
  previewKey = null;
  notifyPreview();
}

// A sample that plays to its end resets its button.
NativeGuide?.addListener('onPreviewEnded', () => {
  if (previewKey !== null) endPreview();
});

/** What's playing as a preview (the key it was started with), or null. */
export const currentPreview = () => previewKey;

export function subscribePreview(listener: () => void): () => void {
  previewListeners.add(listener);
  return () => previewListeners.delete(listener);
}

/**
 * Plays a sample under `key`, stopping any other first. A stop that comes
 * while the sound is still loading wins: the sample never starts.
 */
export async function startPreview(key: string, sound: string, volume: number, maxMs?: number): Promise<void> {
  if (previewKey !== null) stopPreview();
  const token = ++previewToken;
  previewKey = key;
  notifyPreview();
  await prepareSounds([sound]);
  if (token !== previewToken) return;
  if (!audioAvailable() || !loaded.has(sound)) return endPreview();
  try {
    NativeGuide!.playOnce(sound, volume, maxMs);
  } catch {
    endPreview();
  }
}

export function stopPreview(): void {
  if (previewKey === null) return;
  endPreview();
  if (!audioAvailable()) return;
  try {
    NativeGuide!.stopOnce();
  } catch {
    // Nothing to stop.
  }
}

export function subscribe(handlers: GuideHandlers): () => void {
  if (!NativeGuide) return () => undefined;
  const subscriptions = [
    NativeGuide.addListener('onInterruption', (e) => handlers.onInterruption(e.reason)),
    NativeGuide.addListener('onRemoteCommand', (e) => handlers.onRemoteCommand(e.command)),
    NativeGuide.addListener('onSegmentEnded', () => handlers.onSegmentEnded()),
  ];
  return () => subscriptions.forEach((s) => s.remove());
}
