/**
 * Native practice guidance: cues scheduled on the audio clock, lock-screen
 * controls, and interruption reasons. Null where the native module isn't
 * built in (web, tests); src/audio/guide.ts then falls back to visual and
 * haptic guidance on a JS clock.
 */
import { NativeModule, requireOptionalNativeModule } from 'expo';

export type InterruptionReason = 'call' | 'audio' | 'headphones';
export type RemoteCommand = 'play' | 'pause' | 'end';

export interface NativeCue {
  atMs: number;
  sound: string | null;
  /** 0 none, 1 light, 2 medium, 3 strong: a single tap when there are no pulses. */
  haptic: number;
  /** The step's haptic pattern as [atMs, ms, amplitude 0–1, …] from the cue (src/haptics/patterns.ts). */
  pulses: number[];
  nowPlaying: string | null;
}

export interface NativeSegment {
  cues: NativeCue[];
  endMs: number;
  volume: number;
  mixWithOthers: boolean;
  /** Automatic: decide at the start, from whether other audio is already playing. */
  mixIfOthersPlaying: boolean;
  /** Android: lower other audio briefly under each cue while playing along. */
  lowerOthers: boolean;
  title: string;
  subtitle: string;
  /** Music bed looped under the segment, or null for none. The same bed carries on across segments. */
  bed: string | null;
  bedVolume: number;
}

type GuideEvents = {
  onRemoteCommand(event: { command: RemoteCommand }): void;
  onInterruption(event: { reason: InterruptionReason; positionMs: number }): void;
  onSegmentEnded(): void;
  /** A one-shot from playOnce played to its end (not when stopped or replaced). */
  onPreviewEnded(): void;
  /** Developer timing log: how far from its planned time a cue reached the output. */
  onCueTiming(event: { atMs: number; driftMs: number; sound: string }): void;
};

declare class ViramGuideModule extends NativeModule<GuideEvents> {
  /** Loads sounds by ID from local file URIs; resolves with their lengths in ms. */
  preload(sounds: Record<string, string>): Promise<Record<string, number>>;
  startSegment(segment: NativeSegment): void;
  /** Audio-clock position of the current segment, or -1 when idle. */
  positionMs(): number;
  pause(): number;
  finish(): void;
  stop(): void;
  setVolume(volume: number): void;
  setNowPlaying(title: string, subtitle: string): void;
  /** Plays one sound; `maxMs` plays just its start, fading out (a music preview). */
  playOnce(sound: string, volume: number, maxMs?: number): void;
  /** Stops what playOnce is playing; a practice in progress carries on. */
  stopOnce(): void;
  setTimingLog(enabled: boolean): void;
}

export default requireOptionalNativeModule<ViramGuideModule>('ViramGuide');
