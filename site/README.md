# viram.app

Viram's website (PRD section 07), a static site on Cloudflare Pages: the home
page, a guide for every technique, the share-link fallback page, privacy,
support, and the files that let `https://viram.app/r/…` links open the app.
No server code, cookies, trackers, or third-party requests: fonts and images
are served from viram.app itself.

| Path | Purpose |
|---|---|
| `/` | Home: what Viram is, app screenshots, features, the library, privacy, safety, and questions. Hand-written. |
| `/techniques/` and `/techniques/<id>/` | A guide per technique, generated from `src/content/library.ts`: rhythm, steps, take care, tradition, research, and sources, with a breathing orb timed to the technique's real rhythm (`techniques/orbs.css`). |
| `/r/*` | Shared-practice page. `r/decode.js` checks the link with the app's rules and shows it as plain text, with store links and “Open this practice” (`viram://r/…`). `_redirects` serves `r/index.html` for every `/r/…` path. |
| `/privacy/`, `/support/` | Privacy policy (linked from the app and both store listings) and support. Hand-written. |
| `/sitemap.xml`, `/robots.txt` | For search engines. The sitemap is generated. |
| `/llms.txt`, `/llms-full.txt` | For AI assistants ([llmstxt.org](https://llmstxt.org)): a summary with links, and every guide as plain text. Generated. |
| `/.well-known/apple-app-site-association` | iOS Universal Links for `/r/*`. |
| `/.well-known/assetlinks.json` | Android App Links verification. |

`_redirects` and `_headers` use the Netlify / Cloudflare Pages format; other
static hosts need the equivalent rewrite of `/r/*` to `/r/index.html`.

## Generated files

`npm run site:data` (`scripts/build-site-data.mjs`) writes the technique pages,
`techniques/orbs.css`, `r/library.js`, the sitemap, and the llms files from the
app's own content, and fills the shared header, footer, technique list, and
safety notes into the hand-written pages between `<!-- header -->`-style
markers. The shared markup lives in `scripts/lib/site.mjs`. CI runs
`npm run check:site` and fails if anything is stale, so the site never says
something the app doesn't.

`src/sharing/__tests__/site.test.ts` decodes the same links (valid, invalid,
and fuzzed) with the app's codec and with `r/decode.js`, and fails if they
ever disagree.

Images: `img/screen-*.jpg` are Release-build screenshots from the iOS
Simulator (status bar at 9:41); `img/og.jpg`, the link-preview image, is drawn
by `swift scripts/render-og-image.swift`.

## Deploying (Cloudflare Pages)

Pages project on `main`, no build command, output directory `site`, with
`SKIP_DEPENDENCY_INSTALL=1`. Every merge to `main` redeploys.

- `apple-app-site-association` carries the Apple Developer Team ID (`BPD6N9TLQ4`, also `ios.appleTeamId` in `app.json`). The file is served as `application/json` with no redirect.
- Replace `PLAY_APP_SIGNING_SHA256` in `assetlinks.json` with the Play app-signing certificate's SHA-256 fingerprint (Play Console › App integrity), and add the upload key's fingerprint for testing builds.
- At launch, set `APP_STORE_URL` and `PLAY_STORE_URL` in `config.js`. Until then every store button stays hidden and “Coming soon” shows.
- For AI assistants to read the site, leave Cloudflare's AI-crawler blocking and managed robots.txt off (Security › Bots / AI Crawl Control); `robots.txt` here allows everyone.

Preview locally with any static server, for example `python3 -m http.server --directory site`.
