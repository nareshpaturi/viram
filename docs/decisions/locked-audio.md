# Decision: locked-screen guidance on the audio clock

Status: **provisional — chosen and implemented, device measurements pending** · 2026-09-27
Delivery plan: D02 (spike), D04, D05, D15 · Checkpoints: CP1, CP1b · PRD: FR-02, FR-03, FR-04

## Question

How does Viram keep voice and tone cues within ±250 ms with the screen locked, in Low Power Mode, battery saver, and Doze, and with other audio playing?

## Options compared

| | (A) Render the session as one audio track | (B) Native scheduler on the audio clock |
|---|---|---|
| How | Tone and voice clips plus silence mixed into a file, played as background media | Each cue scheduled at an exact audio-clock time by a small native module |
| Timing | Sample-exact within the file | Sample-exact (iOS host-time scheduling; Android frame-exact mixing) |
| Pause and resume | Needs a re-render from the interrupted step on every resume | New segment from the interrupted step; nothing to render |
| Size | A 20-minute mono 44.1 kHz file is about 53 MB; 108 long rounds would be hundreds of MB | Clips only (about 14 MB of placeholder voice, tones under 1 MB) |
| Play alongside music | expo-audio lock-screen controls require `doNotMix`, so music would always stop | Mixes with other audio; Android lowers it only during each cue |
| Interruption reasons | expo-audio reports a pause, not whether it was a call | CallKit (iOS) and the audio mode (Android) name a call; route loss names headphones |
| Haptics while locked (Android Silent) | Not possible from a media file | Scheduled from the same clock |

## Decision

**(B), a native scheduler**, in the local Expo module `modules/viram-guide`:

- **iOS** (`GuideEngine.swift`): an `AVAudioEngine` with two alternating `AVAudioPlayerNode`s. Every cue is scheduled with `scheduleBuffer(_:at:)` at an absolute host time, in a rolling 8-second window refilled by a native timer. A looping silent buffer keeps the `.playback` session, and so the app, running in the background (`UIBackgroundModes: audio`). Position is host time since the segment started, the same clock the cues use. Interruptions pause with a reason: `call` when `CXCallObserver` shows a live call, otherwise `audio`. `oldDeviceUnavailable` means `headphones`. Engine configuration changes re-schedule the remaining cues on the same clock. Now Playing shows the practice, round, and time left. Pause, Play, and Toggle come from `MPRemoteCommandCenter`.
- **Android** (`GuideEngine.kt`, `GuidePlaybackService.kt`): one `AudioTrack` stream fed by a writer thread that mixes cue clips at exact frame positions. The clock is the frames actually played (`AudioTimestamp`). A `mediaPlayback` foreground service keeps the process running with the screen locked, in Doze, and in battery saver. It shows a `MediaStyle` notification with Pause or Resume and End. Haptics and the brief duck are posted for when each cue is heard.
- **JavaScript** (`src/audio/guide.ts`, `src/practice/usePracticeSession.ts`) builds each segment's cue list (`src/breathing/timeline.ts`) and reads position from the native clock. It never times cues itself. Without the module (web, tests), guidance falls back to a JS clock with haptics only (NFR-01).

## Consequences and platform limits found

1. **iOS “Play alongside” can't show lock-screen controls.** iOS gives Now Playing controls only to a non-mixable session. With the default *Play alongside*, guidance still continues when locked, but iOS shows no Now Playing card. *Pause other audio* uses an exclusive session and shows the card with Pause and Resume. **Owner decision needed:** accept this for the default, or make *Pause other audio* the default on iOS.
2. **iOS doesn't briefly lower music under cues.** Changing ducking on an active session requires deactivating it, which would stop the engine. On iOS, *Play alongside* mixes cues over music at cue volume. Android lowers other audio for each cue (`AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK`), then gives it back.
3. **Calls in “Play alongside” on Android** are detected from the audio mode (`MODE_IN_CALL`, `MODE_IN_COMMUNICATION`, `MODE_RINGTONE`), polled about every 0.3 s. No focus is held, so no focus-loss callback arrives. *Pause other audio* holds focus and also pauses when another app takes it.
4. **Siri and alarms on iOS** arrive as a general audio interruption and are shown as “Paused for other audio”. They can't be told apart from other apps' audio.
5. **Background haptics on iOS are not allowed**, so Silent mode pauses on lock on iOS (FR-04). The haptic schedule only fires while the app is in the foreground.
6. **The silent switch** doesn't mute cues. The `.playback` category keeps the prototype's locked decision: a breathing guide that goes mute is a broken guide.
7. **Lock-screen text** (round and time left) travels with the cues and updates natively at each round start, because Android pauses JS timers in the background.
8. A cue already written to the Android buffer (at most one buffer, about 20–80 ms) can still sound right after a pause.

## Evidence still required (blocks CP1b)

None of these can come from a simulator. Record the results in this file.

| Check | iPhone | Android |
|---|---|---|
| 5-min 4 · 4 · 4 · 4, locked from the first step: end within ±250 ms of 5:04 | ☐ | ☐ |
| 20-min Voice session locked: every cue within ±250 ms (log `positionMs` vs. the planned cue time) | ☐ | ☐ |
| Same, in Low Power Mode / battery saver and Doze | ☐ | ☐ |
| Bluetooth headphones connected mid-session: no drift, no pause | ☐ | ☐ |
| Over AirPods or Bluetooth, each cue lands with its visual step change. iOS positions are raw host time; if cues trail by the output latency (about 150–250 ms), subtract `AVAudioSession.outputLatency` from `positionMs` | ☐ | ☐ |
| Headphones disconnected: pauses with “headphones disconnected” | ☐ | ☐ |
| Phone call and VoIP call: pause with “Paused for a call”; nothing plays until Resume | ☐ | ☐ |
| Music playing: *Play alongside* keeps it going (and ducks on Android); *Pause other audio* pauses it | ☐ | ☐ |
| Lock-screen Pause and Resume (iOS in *Pause other audio*); End on Android | ☐ | ☐ |
| Nothing plays after End; audio session released | ☐ | ☐ |

If either platform can't hold ±250 ms, the owner decides the fallback before public release, because the v1.0 promise depends on it.
