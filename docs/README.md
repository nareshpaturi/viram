# Viram — docs

Start with the [design review](design-review.md): its **v3 direction** section is the shared decision contract. Then open the [brand guide](branding-design.html) and [UX mocks](ux-design.html) side by side in a browser. All three were revised on September 22, 2026.

The direction is **“Steady breath. Steady mind.” · Pranayama, guided at your pace.**, with the two-breaths mark. Viram is a free, offline pranayama companion for practitioners, and for beginners who want to follow a technique properly. The MVP (v1.0) ships eight gentle techniques with sourced guides, flexible rhythms with a minutes or rounds target, bundled AI voice cues that keep guiding with the screen locked, sound controls, My rhythms, share links for teachers, app-icon quick actions, data export and backup, and a published free-core promise. v1.1 grows the library to 12 practices and adds curated programs, night practice, gradual slowing, routines, gentle progression, a practice calendar without streaks, an optional daily reminder, and Apple Health / Health Connect session writing.

| Document | Purpose |
|---|---|
| [Design review](design-review.md) | v3 decision contract (positioning, release plan, feature rules, content governance, AI voice, typography, share-link safety, success signals) plus the v2 history |
| [Brand guide](branding-design.html) | Positioning and audiences, naming practices, the two-breaths mark and its construction, semantic palette, practice cue components, style rules, voice and spoken-voice rules, launch copy and link preview |
| [Brand exploration](brand-exploration.html) | Logo, tagline, and style options with the reasoning behind the chosen direction |
| [UX mocks](ux-design.html) | Feature map linked to 81 screen specimens across v1.0, v1.1, and later concepts; journeys; state contract; guidance and accessibility handoff |
| [Product requirements](product-requirements.html) | v2.0 scope and testable behavior for v1.0 and v1.1 |
| [Delivery plan](delivery-plan.md) | Build order: 25 small v1.0 deliverables and 12 for v1.1, each with a demo, scope, dependencies, size, and the gate it closes |
| [Locked-screen audio decision](decisions/locked-audio.md) | D02: how cues stay on the audio clock when locked, the platform limits found, and the device evidence still owed |
| [Launch implementation plan](mvp-launch-implementation-plan.md) | Gated checkpoints for v1.0, the v1.1 track, and historical implementation evidence |
| [Market research](market-research.html) | Research snapshot and opportunity hypotheses |
| [Research notes](research/market-fit-report.md) | Supporting research and unverified items behind the market brief |
| [User needs research](research/user-needs-research.md) | What ~10,000 App Store and Google Play reviews say users want, praise, and complain about; the Prana Breath relaunch; recommended changes |
| [Programs research](research/programs-market-fit.md) | Competitors, teacher platforms, and evidence behind v1.1 curated programs and the pending v1.2 teacher programs |
| [Content research](content/technique-research.md) | Sources, rhythm decisions, evidence, voice script, pronunciation, and source check for the eight v1.0 techniques |
| [Library preview](content/library-preview.html) | The v1.0 technique content exactly as bundled, generated from `src/content/` by `npm run content:preview` |

The brand guide owns identity, color roles, typography, component geometry, and voice. The UX guide owns screen hierarchy, navigation, interaction, and state treatment. The design review records the decisions both must follow. Product requirements describe the resulting scope and behavior. For building, start with the [delivery plan](delivery-plan.md).

The HTML files contain their own styles and mockup markup. Open them directly in a browser; no app build is needed. Google Fonts improves the presentation when available; local serif and system sans fallbacks work offline. The UX viewer needs JavaScript for scene changes. Its controls only change documentation specimens: no timer, audio, voice, haptics, links, quick actions, notifications, storage, Health access, or native permissions run. The mocks' Nadi Shodhana guide follows the sourced v1.0 content; other technique copy in them is illustrative.

The September 22 revision is **documentation and mockups**, plus the brand refresh: the app icon, adaptive and monochrome icons, favicon, and splash were regenerated (`npm run brand:assets`) and the in-app tagline updated. Other application code, native configuration, and implementation checkpoint status are unchanged. `src/theme.ts` is the existing runtime mapping, not evidence that the design has been implemented.

The September 23 content pass adds the bundled library data in `src/content/` (schema, eight techniques, sources, and voice cue scripts) with `npm run check:content` and `npm run content:preview`.

The September 27 implementation builds the v1.0 app on this design. The screens read the library, and a native guide module keeps cues on the audio clock with the screen locked. `site/` holds the static viram.app pages. What's done and what device evidence is still owed are in the delivery plan's [implementation status](delivery-plan.md#implementation-status--2026-09-27). The audio approach and its platform limits are in [decisions/locked-audio.md](decisions/locked-audio.md).
