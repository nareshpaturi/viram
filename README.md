# Viram

**Steady breath. Steady mind.** Pranayama, guided at your pace: a free, offline
pranayama app for iOS and Android.

Twelve gentle techniques with sourced guides, and flexible rhythms by minutes
or rounds. Voice (English and Hindi), tone, and haptic cues keep guiding with
the screen locked, under optional music. It also has routines, two programs,
My rhythms, share links for teachers, a breath circle or illustrated visual
guide, a daily reminder, Apple Health and Health Connect, a home-screen widget,
Apple Watch and Wear OS companions, app-icon quick actions, and local history
with export and import. There is no account, no ads, and no analytics.

> **The voice still needs its listener gate.** `assets/voice/` holds clips
> generated locally with Kokoro, an open-source voice model
> (`npm run audio:voice-kokoro`). They stay marked as placeholders until the
> listener panel approves them (delivery plan D23); “Hear it” on technique
> guides stays hidden until then.

The product docs live in [`docs/`](docs/README.md). Start with the
[delivery plan](docs/delivery-plan.md) and its [implementation status](docs/delivery-plan.md#implementation-status--2026-09-27).

---

## 1. Run it locally

| You need | Notes |
|---|---|
| Node.js 24+ and npm | The content and audio scripts use Node's built-in TypeScript support |
| iOS | A Mac with Xcode 26.4+ (Expo SDK 57) and CocoaPods |
| Android | Android Studio (JDK 17+, SDK 36) |

```bash
npm ci
```

Viram needs a **development build**, not Expo Go. It ships its own native guide
module (`modules/viram-guide`) for locked-screen audio.

```bash
npx expo run:ios
```

```bash
npx expo run:android
```

After the first native build, iterate with `npx expo start --dev-client`.
If CocoaPods fails with an encoding error, run it with `LANG=en_US.UTF-8`.

### Checks

```bash
npm run check
```

That runs `typecheck`, `check:content` (technique content rules),
`check:theme` (WCAG contrast of the tokens), `check:audio` (clip lengths and
the generated manifest), `check:site` (the web page's library data), and the
Jest suites. CI runs the same, plus Android and iOS simulator builds
(`.github/workflows/ci.yml`).

| Script | What it does |
|---|---|
| `npm test` | Unit tests: step engine, session state machine, cue timeline, share-link codec (with fuzzing), storage and migrations, export/import, quick actions, web decoder parity |
| `npm run audio:manifest` | Measures `assets/tones`, `assets/music`, and `assets/voice` and regenerates `src/audio/manifest.generated.ts` |
| `npm run audio:tones` | Renders the Soft bells, Wood, and Chimes tone sets, in tune with the music |
| `npm run audio:music` | Renders the Tanpura and Soft pad music beds (seamless 48 s loops) |
| `npm run audio:samples` | Builds first use's Voice and Bells samples from the bundled clips; run it after the voices or tones change |
| `npm run audio:voice-kokoro` | Renders every clip for each voice in `src/audio/voices.ts` locally with Kokoro; setup is at the top of the script |
| `npm run audio:voice` | Renders one voice with ElevenLabs into `assets/voice/viram/` (needs a paid plan and key) |
| `npm run site:data` | Regenerates the site's technique guides and `site/share/library.js` from the technique library |
| `npm run content:preview` | Renders `docs/content/library-preview.html` |
| `npm run brand:assets` | Renders the app icon, adaptive icons, favicon, and splash |

---

## 2. What to test on a phone

These need physical devices; the simulator can't prove them. Record results in
[`docs/decisions/locked-audio.md`](docs/decisions/locked-audio.md).

Development builds have **Settings › Developer › Cue timing**. It shows how far
each cue landed from its planned time, measured from the audio hardware, and
the completion cue's drift. Share its CSV with the results. For an internal
release build, set `EXPO_PUBLIC_TIMING_LOG=1` to keep it.

Android builds need JDK 17 or 21. With Homebrew, `brew install openjdk@17`, then
set `JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home`.

1. **Locked-screen timing.** Begin box breathing at 5 minutes in Voice mode, lock the phone at once, and check that it ends within ±250 ms of 5:04. Repeat with Tones, 20 minutes, Low Power Mode or battery saver, and Doze.
2. **Interruptions.** A phone call, headphones unplugged, and another app playing audio should each pause the practice and say why. Resume restarts the step after three seconds.
3. **Music.** With *Play along*, music keeps playing (on Android it dips under each cue). With *Pause other audio*, Viram pauses it.
4. **Lock-screen controls.** iOS Now Playing (in *Pause other audio*) and the Android media notification show the practice, round, and time left, with Pause and Resume (and End on Android).
5. **Silent mode.** The screen stays on. Locking pauses on iOS, and on Android continues with haptics.
6. **Links.** `viram://r/…` opens the preview now. Universal Links and App Links need viram.app hosting (see [`site/README.md`](site/README.md)).
7. **Quick actions.** Long-press the icon on a cold start and a warm start, and again before first use.
8. **Backup.** Restore from an iOS backup or Android Auto Backup, and export and import between phones.

---

## 3. Project structure

```
app/                         expo-router screens
  _layout.tsx                fonts, storage (recoverable error), preferences, quick actions, stack
  (tabs)/                    Breathe · Practices · History · Settings
  welcome.tsx                one-screen first use
  practice.tsx               intro → settle → guidance → paused / end confirmation
  visual-guide.tsx           breath circle or illustrated guide, with silent previews
  complete.tsx               completion; saves the record, retry on failure
  technique/[id].tsx         technique guide
  adjust.tsx                 Adjust rhythm (library structure or the four-row builder)
  save-rhythm.tsx            save or rename a rhythm (1–40 plain-text characters, up to 20)
  rhythms.tsx                My rhythms
  share.tsx, r/[payload].tsx share preview and incoming link
  session/[id].tsx           history detail
  routine/, program/         routines (2–6 practices) and the two curated programs
  health.tsx                 Apple Health / Health Connect connection
  settings/                  cues & sound, reminder, longer holds, watch, your data, safety, privacy, about, sources
src/
  breathing/                 pure step engine, rhythm math, session state machine, cue timeline
  content/                   bundled technique library, sources, voice cue rules, safety copy
  audio/                     guide API (native clock, JS fallback), generated sound manifest
  sharing/link.ts            share-link encode, decode, and validation
  practice/                  practice model, launching, the session hook
  history/, rhythms/,        repositories (screens never issue SQL)
  settings/, storage/        preferences, migrations, database opener
  data/transfer.ts           export and import
  quickstart/                app-icon quick actions
  routines/, programs/       routine and program models
  reminder/, health/         daily reminder and Health writing
  companion/, widget/        watch companions and the home-screen widget
  components/                shared, token-driven UI
  theme.ts                   brand tokens and text styles
modules/viram-guide/         native guide: Swift (AVAudioEngine) and Kotlin (AudioTrack + mediaPlayback service)
modules/viram-health/        Apple Health and Health Connect
modules/viram-companion/     WatchConnectivity and the Wear OS Data Layer
modules/viram-widget/        widget data for iOS and Android
targets/                     the watchOS app and the iOS widget (@bacons/apple-targets)
plugins/                     config plugins: the Wear OS module, local notifications only
site/                        static viram.app: link fallback page, privacy, support, link-verification files
assets/tones, assets/music  tone sets and music beds, all in Sa = C♯
assets/voice/<voice>         each voice's clips: cues as WAV, introductions as AAC (Kokoro, pending the listener gate)
```

## 4. Architecture notes

- **Local-first.** Sessions, My rhythms, and preferences live in SQLite (`viram.sqlite`) with forward-only migrations. Each migration runs in one transaction, so a failure keeps the data and shows a recoverable error. The file is in iCloud and device backups and in Android Auto Backup.
- **One clock.** The native guide schedules every cue on the audio clock and reports its position. The screen derives everything from `(session state, clock)`. JavaScript never times cues. See [the locked-audio decision](docs/decisions/locked-audio.md).
- **Validated boundaries.** Rhythms from storage, route params, share links, and import files all pass the same rules (`validateRhythm`). Link content is shown as plain text only. Instructions and safety text come from the bundled library.
- **Permissions only when asked.** Health (Apple Health, Health Connect) and notifications (the daily reminder) are requested only when the person turns them on. There is no microphone permission.
