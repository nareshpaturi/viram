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

/** Every sound a practice can use with these settings: cue clips and one tone set. */
export function practiceSounds(toneSet: string): string[] {
  const kinds = ['inhale', 'hold', 'exhale', 'rest', 'complete'];
  // Night practice always finishes on the soft bells (FR-23), whatever the tone set.
  const tones = new Set([...kinds.map((k) => `tone.${toneSet}.${k}`), 'tone.soft-bells.complete']);
  return [...tones, ...Object.keys(CUES).map((id) => `voice.${id}`)];
}

/** Length of a loaded voice clip, from the build-time manifest. */
export function clipLength(clipId: string): number | undefined {
  return loaded.has(`voice.${clipId}`) ? CLIP_MS[clipId] : undefined;
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
  const cues = schedule.cues.map((cue) => ({
    atMs: cue.atMs,
    sound: cue.sound && loaded.has(cue.sound) ? cue.sound : null,
    haptic: cue.haptic ? HAPTIC_LEVEL[cue.haptic] : 0,
    pulses: flatPulses(cue.pulses),
    nowPlaying: cue.nowPlaying,
  }));
  if (audioAvailable()) {
    try {
      NativeGuide!.startSegment({ cues, endMs: schedule.endMs, mixIfOthersPlaying: false, lowerOthers: false, ...options });
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

/** “Hear it” and “Hear a sample”. Resolves false when audio is unavailable. */
export async function playOnce(id: string, volume: number): Promise<boolean> {
  await prepareSounds([id]);
  if (!audioAvailable() || !loaded.has(id)) return false;
  try {
    NativeGuide!.playOnce(id, volume);
    return true;
  } catch {
    return false;
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
