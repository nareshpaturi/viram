# viram.app

The only hosted surface for Viram (PRD section 07): a static site with the
share-link fallback page, the privacy policy, support, and the files that let
`https://viram.app/r/…` links open the app. No server code, cookies, trackers,
or third-party requests.

| Path | Purpose |
|---|---|
| `/r/*` | Shared-practice page. `r/decode.js` checks the link with the app's rules and shows it as plain text, with store links and “Open this practice” (`viram://r/…`). `_redirects` serves `r/index.html` for every `/r/…` path. |
| `/privacy/` | Privacy policy, linked from the app and both store listings. |
| `/support/` | Support contact and common questions. |
| `/.well-known/apple-app-site-association` | iOS Universal Links for `/r/*`. |
| `/.well-known/assetlinks.json` | Android App Links verification. |

`_redirects` and `_headers` use the Netlify / Cloudflare Pages format; other
static hosts need the equivalent rewrite of `/r/*` to `/r/index.html`.

## Before deploying (owner lane, delivery plan D18)

- Register viram.app and point it at the static host.
- `apple-app-site-association` carries the Apple Developer Team ID (`BPD6N9TLQ4`, also `ios.appleTeamId` in `app.json`). The file is served as `application/json` with no redirect.
- Replace `PLAY_APP_SIGNING_SHA256` in `assetlinks.json` with the Play app-signing certificate's SHA-256 fingerprint (Play Console › App integrity), and add the upload key's fingerprint for testing builds.
- Set `APP_STORE_URL` in `config.js` once the App Store record exists.
- Confirm the `hello@viram.app` support address.

## Keeping it in step with the app

`r/library.js` is generated from `src/content/library.ts` by
`npm run site:data`; CI fails if it is stale. `src/sharing/__tests__/site.test.ts`
decodes the same links (valid, invalid, and fuzzed) with the app's codec and
with `r/decode.js`, and fails if they ever disagree.

Preview locally with any static server, for example `npx serve site`.
