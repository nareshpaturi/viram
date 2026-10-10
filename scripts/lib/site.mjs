// Shared markup for viram.app (site/). The generator (scripts/build-site-data.mjs)
// writes these into every page between <!-- header -->, <!-- footer --> and
// similar markers, so hand-written and generated pages stay in step.

export const ORIGIN = 'https://viram.app';
export const EMAIL = 'hello@viram.app';

/**
 * Store pages, empty until Viram is live there. At launch, set them and run
 * `npm run site:data`: every page then links the stores in plain HTML, and the
 * home page's structured data describes the app. Links carry a fixed campaign
 * name only, never anything about a person or a link (FR-11, privacy).
 */
export const STORES = {
  app: '',
  // At launch: 'https://play.google.com/store/apps/details?id=app.viram&referrer=utm_source%3Dviram.app%26utm_campaign%3Dsite'
  play: '',
};
export const LAUNCHED = Boolean(STORES.app || STORES.play);

/**
 * AI crawlers, named in robots.txt so the choice is plain. Search crawlers let
 * assistants find and cite the guides; training crawlers (and Google's and
 * Apple's training tokens) may use the pages to train models, which is a
 * separate choice from search. Set allowTraining to false to opt out of
 * training only; search stays open either way.
 */
export const AI_CRAWLERS = {
  search: ['OAI-SearchBot', 'Claude-SearchBot', 'PerplexityBot'],
  training: ['GPTBot', 'ClaudeBot', 'Google-Extended', 'Applebot-Extended'],
  allowTraining: true,
};

/** Short answers to common questions, generated from the app's content. */
export const LEARN = [
  { path: '/learn/getting-started/', title: 'Getting started with pranayama' },
  { path: '/learn/box-vs-coherent-breathing/', title: 'Box breathing and coherent breathing' },
  { path: '/learn/offline-and-locked-screen/', title: 'Offline and with your screen locked' },
];

/** When the technique guides last changed (content review fixes, PR #22). Update with the copy. */
export const GUIDES_UPDATED = { iso: '2026-10-08', text: 'October 8, 2026' };

export const esc = (text) =>
  String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export const MARK = `<svg viewBox="0 0 100 100" aria-hidden="true"><rect width="100" height="100" rx="22" fill="#12372F"/><path d="M36.85 27.28A28 28 0 0 0 36.85 76.72" stroke="#A8CFD0" stroke-width="9" stroke-linecap="round" fill="none"/><path d="M63.15 27.28A28 28 0 0 1 63.15 76.72" stroke="#EEF4EF" stroke-width="9" stroke-linecap="round" fill="none"/><circle cx="50" cy="27.3" r="4.6" fill="#E46F51"/></svg>`;

export const CSP =
  "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; base-uri 'none'; form-action 'none'";

/** The <head> every generated page shares; hand-written pages carry the same lines. */
export function head({ title, description, path, image = '/img/og.jpg', type = 'website', extraCss = [] }) {
  const url = `${ORIGIN}${path}`;
  return `<meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="referrer" content="no-referrer">
  <meta http-equiv="Content-Security-Policy" content="${CSP}">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <link rel="canonical" href="${url}">
  <meta name="theme-color" content="#FBFCF8">
  <link rel="icon" href="/img/favicon.svg" type="image/svg+xml">
  <link rel="icon" href="/img/favicon-32.png" sizes="32x32" type="image/png">
  <link rel="apple-touch-icon" href="/img/apple-touch-icon.png">
  <link rel="preload" href="/fonts/dm-sans-400.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="/fonts/newsreader-500.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="/style.css">
${extraCss.map((href) => `  <link rel="stylesheet" href="${href}">\n`).join('')}  <meta property="og:type" content="${type}">
  <meta property="og:site_name" content="Viram">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:url" content="${url}">
  <meta property="og:image" content="${ORIGIN}${image}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">`;
}

/**
 * Before launch the main action is reading the guides; after, getting the app.
 * Techniques stays in reach on phones either way (QA website audit).
 */
export const HEADER = `<!-- header -->
  <a class="skip" href="#main">Skip to content</a>
  <header class="site-header">
    <div class="wrap">
      <a class="brand" href="/" aria-label="Viram home">${MARK} Viram</a>
      <nav class="site-nav" aria-label="Main">
        <a href="/#how">How it works</a>
${LAUNCHED ? '        <a class="keep" href="/techniques/">Techniques</a>\n' : ''}        <a href="/#faq">FAQ</a>
        <a href="/about/">About</a>
        ${LAUNCHED ? '<a class="pill" href="/#get">Get Viram</a>' : '<a class="pill" href="/techniques/">Explore techniques</a>'}
      </nav>
    </div>
  </header>
  <!-- /header -->`;

/** The footer, with a few practices from the library. */
export function footer(techniques) {
  const picks = ['sama-vritti', 'visama-vritti', 'nadi-shodhana', 'bhramari', '4-7-8', 'coherent']
    .map((id) => techniques.find((t) => t.id === id))
    .filter(Boolean);
  return `<!-- footer -->
  <footer class="site-footer">
    <div class="wrap">
      <div>
        <a class="brand" href="/">${MARK} Viram</a>
        <p>Pranayama, guided at your pace. Free, private, and ready offline.</p>
      </div>
      <div>
        <h2>Practise</h2>
        <ul>
${picks.map((t) => `          <li><a href="/techniques/${t.id}/">${esc(t.name)}</a></li>`).join('\n')}
          <li><a href="/techniques/">All techniques</a></li>
        </ul>
      </div>
      <div>
        <h2>Viram</h2>
        <ul>
          <li><a href="/#how">How it works</a></li>
${LEARN.map((l) => `          <li><a href="${l.path}">${esc(l.title)}</a></li>`).join('\n')}
          <li><a href="/about/">About our guides</a></li>
          <li><a href="/privacy/">Privacy</a></li>
          <li><a href="/support/">Support</a></li>
          <li><a href="mailto:${EMAIL}">${EMAIL}</a></li>
        </ul>
      </div>
      <p class="fine">A wellness practice, not medical advice. Breathe gently, and stop if you feel dizzy or uncomfortable. © 2026 Viram.</p>
    </div>
  </footer>
  <!-- /footer -->`;
}

const LAUNCH_MAIL = `mailto:${EMAIL}?subject=Tell%20me%20when%20Viram%20is%20out`;

/** Store links, in plain HTML so they work without JavaScript. */
function storeLinks() {
  return [
    STORES.app ? `<a class="button" href="${esc(STORES.app)}">Download on the App Store</a>` : '',
    STORES.play ? `<a class="button" href="${esc(STORES.play)}">Get it on Google Play</a>` : '',
  ].filter(Boolean);
}

/**
 * The page's main action. Before launch: explore the guides, or ask for a note
 * at launch. After: the stores. `explore` adds the guides as a second action.
 */
export function getViram({ explore = true } = {}) {
  if (LAUNCHED) {
    return `<div class="actions">
          ${[...storeLinks(), explore ? '<a class="button secondary" href="/techniques/">Explore techniques</a>' : ''].filter(Boolean).join('\n          ')}
        </div>
        <p class="avail">Free on iPhone and Android. No ads, no account, ready offline.</p>`;
  }
  return `<div class="actions">
          ${explore ? '<a class="button" href="/techniques/">Explore techniques</a>\n          ' : ''}<a class="button ${explore ? 'secondary' : ''}" href="${LAUNCH_MAIL}">Email me at launch</a>
        </div>
        <p class="avail">Coming soon for iPhone and Android. Free, private, and ready offline.</p>`.replace('class="button "', 'class="button"');
}
