# viram.app

Viram's website (PRD section 07), a static site on Cloudflare Pages: the home
page, a guide for every technique, the share-link fallback page, privacy,
support, and the files that let `https://viram.app/r/…` links open the app.
No server code, cookies, trackers, or third-party requests: fonts and images
are served from viram.app itself.

| Path | Purpose |
|---|---|
| `/` | Home: the app in the hero, three benefits, how it works, three first techniques, privacy and care, Viram at a glance (the same facts as `llms.txt`), and four questions. Hand-written. |
| `/learn/…` | Short answers to common questions (getting started, box or coherent breathing, offline and locked), each opening with the answer. Generated from the app's content and wording. |
| `/techniques/` and `/techniques/<id>/` | A guide per technique, generated from `src/content/library.ts`: rhythm, steps, take care, tradition, research, and sources, with a breathing orb timed to the technique's real rhythm (`techniques/orbs.css`). |
| `/r/*` | Shared-practice links. `_redirects` rewrites every `/r/…` path to the page in `share/` (outside `/r/`, so no file there can shadow a link); `share/decode.js` checks the link with the app's rules and shows it as plain text, with “Open this practice” (`viram://r/…`). |
| `/about/` | Who makes Viram, how the guides are written and sourced, who has (and hasn't) reviewed them, and how to send a correction. Hand-written. |
| `/privacy/`, `/support/` | Privacy policy (linked from the app and both store listings) and support. Hand-written. |
| `/sitemap.xml`, `/robots.txt` | For search engines and AI crawlers. Both generated: the sitemap with each page's `lastmod`, and robots.txt naming AI search and AI training crawlers separately (`AI_CRAWLERS` in `scripts/lib/site.mjs`). |
| `/llms.txt`, `/llms-full.txt` | For AI assistants ([llmstxt.org](https://llmstxt.org)): a summary with links, and every guide as plain text. Generated. |
| `/.well-known/apple-app-site-association` | iOS Universal Links for `/r/*`. |
| `/.well-known/assetlinks.json` | Android App Links verification. |

`_redirects` and `_headers` use the Netlify / Cloudflare Pages format; other
static hosts need the equivalent rewrite of `/r/*` to `/share/`. Cloudflare Pages
redirects any `…/index.html` URL to `…/`, so rewrite targets must be the folder.

## Generated files

`npm run site:data` (`scripts/build-site-data.mjs`) writes the technique pages,
`techniques/orbs.css`, `r/library.js`, the sitemap, and the llms files from the
app's own content, and fills the shared header, footer, main actions,
structured data, first techniques, and care notes into the hand-written pages
between `<!-- header -->`-style markers. The shared markup lives in `scripts/lib/site.mjs`. CI runs
`npm run check:site` and fails if anything is stale, so the site never says
something the app doesn't.

`src/sharing/__tests__/site.test.ts` decodes the same links (valid, invalid,
and fuzzed) with the app's codec and with `r/decode.js`, and fails if they
ever disagree.

Images: `img/screen-*.jpg` are Release-build screenshots from the iOS
Simulator (status bar at 9:41); `img/og.jpg`, the link-preview image, is drawn
by `swift scripts/render-og-image.swift`.

Fonts: DM Sans 400/600 and Newsreader 500, self-hosted as WOFF2 subset to
Latin (56 KB in all), made from `@expo-google-fonts` with fontTools:
`pyftsubset <font>.ttf --flavor=woff2 --layout-features='*' --unicodes=U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2190-2199,U+2212,U+2215,U+FEFF,U+FFFD`.
Devanagari names fall back to the system font.

Motion: the only animation is each guide's breathing orb, which stays still
until the reader starts it and stops on request (WCAG 2.2.2), and never moves
under Reduce Motion.

## Deploying (Cloudflare Pages)

Pages project on `main`, no build command, output directory `site`, with
`SKIP_DEPENDENCY_INSTALL=1`. Every merge to `main` redeploys.

- `apple-app-site-association` carries the Apple Developer Team ID (`BPD6N9TLQ4`, also `ios.appleTeamId` in `app.json`). The file is served as `application/json` with no redirect.
- Replace `PLAY_APP_SIGNING_SHA256` in `assetlinks.json` with the Play app-signing certificate's SHA-256 fingerprint (Play Console › App integrity), and add the upload key's fingerprint for testing builds.
- At launch, set `STORES` in `scripts/lib/site.mjs` and run `npm run site:data`. Every page then links the stores in plain HTML (no JavaScript needed), the header's action becomes Get Viram, and the home page's structured data adds the app. Until then the main action is Explore techniques, with “Email me at launch”.
- For AI assistants to read the site, leave Cloudflare's AI-crawler blocking and managed robots.txt off (AI Crawl Control); a firewall block overrides `robots.txt`. To opt out of AI training but stay in AI search, set `AI_CRAWLERS.allowTraining` to false.
- Turn on Cloudflare's Crawler Hints (Caching › Configuration) so changes are announced to IndexNow search engines such as Bing after each deploy.
- When a page changes, update its date in `UPDATED` in `scripts/build-site-data.mjs` (the sitemap's `lastmod`).

Preview locally with any static server, for example `python3 -m http.server --directory site`.
