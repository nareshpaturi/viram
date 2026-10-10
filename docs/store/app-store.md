# App Store listing · Viram 1.0 (iPhone)

Copy for App Store Connect, ready to paste. Every claim matches the 1.0 app;
change it here first if the app changes. Screenshots are in
`docs/store/screenshots/ios-6.9/` (1320 × 2868, the 6.9" size App Store
Connect requires; it scales them for smaller iPhones).

Scope of 1.0: iPhone and the home- and lock-screen widget. No Apple Watch app
(app.json builds only the widget target; see `targets/watch/expo-target.config.js`).

## App information

| Field | Value |
|---|---|
| Name (30) | Viram: Pranayama & Breathing |
| Subtitle (30) | Breathwork guided by voice |
| Bundle ID | app.viram |
| SKU | viram-ios |
| Primary language | English (U.S.) |
| Category | Health & Fitness (secondary: Lifestyle) |
| Content rights | Contains no third-party content |
| Age rating | 4+: answer None to every question. The app is wellness guidance with care notes, not medical treatment. |
| Copyright | 2026 Viram |
| Price | Free |

## URLs

| Field | Value |
|---|---|
| Support URL | https://viram.app/support/ |
| Marketing URL | https://viram.app/ |
| Privacy Policy URL | https://viram.app/privacy/ |

## Promotional text (170)

Steady breath, steady mind. Twelve gentle pranayama techniques, guided by a calm voice that keeps going with your phone locked. Free, with no ads and no account.

## Keywords (100)

```
breathwork,box breathing,anulom vilom,nadi shodhana,4-7-8,meditation,yoga,bhramari,ujjayi,calm,sleep
```

## Description

```
Steady breath. Steady mind.

Viram guides authentic pranayama and modern breathing practices at your pace, with a calm voice, soft tones, or gentle haptics. Close your eyes and put your phone down: with voice or tones, Viram keeps guiding with the screen locked.

TWELVE GENTLE TECHNIQUES
Sama Vritti (box breathing), Visama Vritti (extended exhale), Nadi Shodhana (alternate nostril breathing, also called Anulom Vilom), Bhramari (humming bee breath), Ujjayi (ocean breath), Sheetali (cooling breath), coherent breathing, 4-7-8 breathing, Dirgha (three-part breath), Udgeeth (Om chanting), Chandra Bhedana, and cyclic sighing. Each has clear steps, care notes, and the sources behind it.

GUIDANCE THAT KEEPS TIME
• A calm voice names each step, with captions, in American, British, or Indian English
• Or one of three tone sets, or haptics that feel different for each phase
• A short spoken introduction the first time you try a technique
• Keeps guiding with your screen locked

YOUR PRACTICE, YOUR PACE
• Any length from 1 to 60 minutes, or a set number of rounds
• Adjust any rhythm, slow it gradually, and save your own
• Pranayama Foundations, a beginner program that teaches one technique at a time
• Routines that join your favourite practices
• Night practice on a dim, true-black screen
• Share any practice with your students by link
• A widget to begin from your home or lock screen

PRIVATE BY DESIGN
Free, with no ads, no subscriptions, and no account. Viram doesn’t collect your practice history: it stays on your iPhone, and you can export it anytime. If you choose, Viram adds completed practices to Apple Health as mindful minutes. It never reads your health data.

Works offline. Everything, including the voice, is on your iPhone.

Viram is a wellness practice, not medical advice. Breathe gently, and stop if you feel dizzy or uncomfortable. If you live with a heart or lung condition or are pregnant, check with your clinician first.
```

## App Privacy

**Data Not Collected.** Viram has no account, server, analytics, or advertising SDKs. Practice history stays on the device. Apple Health writes stay in Apple Health on the device, so they are not data collected by the developer.

## App Review information

Sign-in required: **No.** Contact: the owner's name, phone, and email.

Notes:

```
Viram is a free breathing-practice app. No account or sign-in is needed.

Background audio (UIBackgroundModes: audio): the core feature is spoken and tone guidance that continues when the screen is locked, so people can practise with their eyes closed. To see it: on the Breathe tab, tap Begin, wait for the practice to start, then lock the device. The voice keeps guiding, and the lock screen shows the practice with pause and resume controls.

HealthKit (optional): Settings › Apple Health › Continue, then allow Mindful Minutes. Viram only writes a mindful session (start and end time) for each completed practice of at least 60 seconds, and never reads health data. The app works fully without it.

There are no ads, analytics, tracking, or in-app purchases. The content is wellness guidance, not medical advice; every technique shows its care notes before practice.
```

## Export compliance

`ITSAppUsesNonExemptEncryption` is false in app.json, so App Store Connect won't ask about encryption for each build.

## TestFlight

Beta app description:

```
Viram guides gentle pranayama and breathing practices by voice, tones, or haptics, and keeps guiding with your phone locked. Thank you for testing it before release.
```

What to test:

```
Please try a few practices and tell us how they feel. We especially want to know:

1. The voice: rate each from 1 (poor) to 5 (excellent) and send it with TestFlight feedback or to hello@viram.app:
   - Clarity: is every word easy to understand?
   - Naturalness: does it sound calm and human enough?
   - Sanskrit names: are Nadi Shodhana, Bhramari, Ujjayi, and the others said well?
   Try at least two voices (Settings › Cues & sound › Voice).
2. Lock your phone during a practice: does guidance continue, on time?
3. Haptics: can you tell inhale, hold, and exhale apart by touch?
4. Larger text (iOS Settings › Display & Brightness › Text Size): is anything cut off?
5. Anything confusing, broken, or uncomfortable.
```

Feedback email: hello@viram.app

## Before submitting for review

- [ ] TestFlight build installed on a physical iPhone; the physical checks in `reports/iphone-verification-2026-10-08.md` done.
- [ ] Voice listener gate (delivery plan D23): at least 8 listeners, median 4/5 or better, from the TestFlight ratings above.
- [ ] Hindi voices: keep only if Hindi listeners approve them; otherwise remove them from the picker before submitting.
- [ ] Screenshots uploaded, listing text pasted, App Privacy answered, age rating set.
