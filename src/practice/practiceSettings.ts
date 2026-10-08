/**
 * What a practice takes from the preferences, decided once when it starts
 * and fixed for its length. Changing a preference mid-practice, such as the
 * visual guide while paused, never reaches a running session.
 */
import { musicSound } from '../audio/music';
import type { CueSettings } from '../breathing/timeline';
import type { OtherAudio, Preferences } from '../settings/preferences';
import { lockBehavior } from './guidanceRules';

/** Silent's soft tones on a locked iPhone are never louder than this. */
const SILENT_LOCKED_VOLUME = 0.4;

function otherAudioOptions(otherAudio: OtherAudio) {
  return {
    mixWithOthers: otherAudio === 'alongside' || otherAudio === 'lower',
    mixIfOthersPlaying: otherAudio === 'auto',
    lowerOthers: otherAudio === 'lower',
  };
}

export function practiceSettings(preferences: Preferences, night: boolean, platform: string) {
  return {
    cues: {
      mode: preferences.cueMode,
      toneSet: preferences.toneSet,
      haptics: preferences.haptics ? preferences.hapticStrength : null,
      hapticStyle: preferences.hapticStyle,
      hapticPhases: preferences.hapticPhases,
      softFinish: night,
      counting: preferences.voiceCounting,
    } satisfies CueSettings,
    volume: preferences.cueVolume,
    audio: otherAudioOptions(preferences.otherAudio),
    voice: preferences.voice,
    // Music plays under Voice and Tones; Silent stays silent.
    bed:
      preferences.cueMode !== 'silent' && preferences.music !== 'off'
        ? { sound: musicSound(preferences.music), volume: preferences.musicVolume }
        : null,
    // What keeps guiding once the phone locks (src/practice/guidanceRules.ts); Cues & sound says the same.
    lock: lockBehavior({ mode: preferences.cueMode, haptics: preferences.haptics, silentLocked: preferences.silentLocked, platform }),
    lockedVolume: Math.min(preferences.cueVolume, SILENT_LOCKED_VOLUME),
  };
}

export type PracticeSettings = ReturnType<typeof practiceSettings>;
