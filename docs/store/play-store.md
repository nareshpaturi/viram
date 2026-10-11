# Google Play listing · Viram 1.0 (Android phones)

Copy and answers for Play Console, ready to paste. Every claim matches the
1.0 app; change it here first if the app changes. Graphics are in
`docs/store/play/`.

Scope of 1.0: Android phones and the home-screen widget. The Wear OS app isn't
published yet (`WATCH_APP_AVAILABLE` in `src/companion/watchState.ts`).

## Create the app

| Field | Value |
|---|---|
| App name (30) | Viram: Pranayama & Breathing |
| Default language | English (United States) |
| App or game | App |
| Free or paid | Free |
| Package | app.viram (set by the first upload) |

## Main store listing

Short description (80):

```
Gentle pranayama, guided by voice, even with your phone locked. Free, no ads.
```

Full description:

```
Steady breath. Steady mind.

Viram guides authentic pranayama and modern breathing practices at your pace, with a calm voice, soft tones, or gentle haptics. Close your eyes and put your phone down: Viram keeps guiding with the screen off.

TWELVE GENTLE TECHNIQUES
Sama Vritti (box breathing), Visama Vritti (extended exhale), Nadi Shodhana (alternate nostril breathing, also called Anulom Vilom), Bhramari (humming bee breath), Ujjayi (ocean breath), Sheetali (cooling breath), coherent breathing, 4-7-8 breathing, Dirgha (three-part breath), Udgeeth (Om chanting), Chandra Bhedana, and cyclic sighing. Each has clear steps, care notes, and the sources behind it.

GUIDANCE THAT KEEPS TIME
• A calm voice names each step, with captions, in American, British, or Indian English
• Or one of three tone sets, or haptics that feel different for each phase
• A short spoken introduction the first time you try a technique
• Keeps guiding with your screen off, by voice, tones, or haptics

YOUR PRACTICE, YOUR PACE
• Any length from 1 to 60 minutes, or a set number of rounds
• Adjust any rhythm, slow it gradually, and save your own
• Pranayama Foundations, a beginner program that teaches one technique at a time
• Routines that join your favourite practices
• Night practice on a dim, true-black screen
• Share any practice with your students by link
• A home-screen widget to begin in one tap

PRIVATE BY DESIGN
Free, with no ads, no subscriptions, and no account. Viram doesn’t collect your practice history: it stays on your phone, and you can export it anytime. If you choose, Viram adds completed practices to Health Connect as mindfulness sessions. It never reads your health data.

Works offline. Everything, including the voice, is on your phone.

Viram is a wellness practice, not medical advice. Breathe gently, and stop if you feel dizzy or uncomfortable. If you live with a heart or lung condition or are pregnant, check with your clinician first.
```

| Field | Value |
|---|---|
| App icon | `docs/store/play/icon-512.png` (512 × 512) |
| Feature graphic | `docs/store/play/feature-graphic.png` (1024 × 500) |
| Phone screenshots | `docs/store/play/screenshots/` (1080 × 1920, 9:16) |
| Category | Health & Fitness |
| Tags | Breathing, Meditation, Yoga, Wellness, Relaxation (pick the closest Play offers) |
| Email | hello@viram.app |
| Website | https://viram.app/ |
| Privacy policy | https://viram.app/privacy/ |

## App content (Policy › App content)

| Declaration | Answer |
|---|---|
| Privacy policy | https://viram.app/privacy/ |
| Ads | No, the app doesn’t contain ads |
| App access | All functionality is available without special access (no sign-in) |
| Content rating | Complete the IARC questionnaire; answer No to every content question. Expect Everyone / PEGI 3 |
| Target audience | 18 and over (recommended for 1.0: the care notes are written for adults, and it keeps the app outside the Families policy) |
| News app | No |
| Government app | No |
| Financial features | None |
| Advertising ID | No, the app doesn’t use an advertising ID |
| Data safety | See below |
| Health apps | See below |
| Foreground service permissions | See below |

### Data safety

- Does the app collect or share any of the required user data types? **No.**
- Reason: Viram has no account, server, analytics, or advertising SDKs. Practice history, settings, and saved rhythms stay on the device. Health Connect writes stay in Health Connect on the device, so they are not collected or shared.
- Then confirm the summary shows **No data collected** and **No data shared**.

### Health apps declaration

- Features: **Breathing, mindfulness, or meditation** (choose the closest wellness options; not a medical device, no medical features).
- Health Connect: requests **write** access to **Mindfulness** only (`android.permission.health.WRITE_MINDFULNESS`), never read access.
- How it’s used: “When the user turns it on in Settings, Viram adds each completed breathing practice of at least one minute to Health Connect as a mindfulness session with its start and end time. Viram never reads Health Connect data. The app’s rationale screen and https://viram.app/privacy/ explain this.”

### Foreground service permissions

- Type: **Media playback** (`FOREGROUND_SERVICE_MEDIA_PLAYBACK`).
- Description: “While the user is practising, Viram plays its breathing guidance (voice cues and tones) so it continues with the screen off; the practice shows in the media notification, where it can be paused or stopped. The service runs only during a practice the user started.”
- Video: a short screen recording, uploaded unlisted (YouTube or Google Drive): start a practice, lock the phone, show the guidance continuing and the media notification’s pause.

## Releases

1. Build the app bundle (EAS creates and keeps the upload key):
   `npx eas-cli@latest build --platform android --profile production`
2. Download the `.aab` from the build page. In **Testing › Internal testing**, create a release, upload it (keep **Play App Signing** on), and roll it out to your internal testers.
3. From **Setup › App integrity › App signing**, copy the **app signing key** SHA-256 fingerprint (and the upload key’s) into `site/.well-known/assetlinks.json`, so share links open the app.
4. A personal developer account must run a **closed test with at least 12 testers, opted in for 14 days in a row**, before it can apply for production access. An organization account can go to production directly.
5. Later uploads can go through `eas submit --platform android` once a Play service account key is set up for EAS (Play requires the first upload to be manual).

## Before production

- [ ] Internal test installed from Play on a phone; the Samsung verification items checked again on the Play build.
- [ ] Voice listener gate (delivery plan D23), shared with the iOS TestFlight panel.
- [ ] assetlinks.json has the Play app signing fingerprint, and a share link opens the app.
- [ ] Closed test complete (personal accounts), listing and App content finished.
