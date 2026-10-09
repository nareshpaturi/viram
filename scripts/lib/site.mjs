// Shared markup for viram.app (site/). The generator (scripts/build-site-data.mjs)
// writes these into every page between <!-- header -->, <!-- footer --> and
// similar markers, so hand-written and generated pages stay in step.

export const ORIGIN = 'https://viram.app';
export const EMAIL = 'hello@viram.app';

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
  <link rel="preload" href="/fonts/dm-sans-400.ttf" as="font" type="font/ttf" crossorigin>
  <link rel="preload" href="/fonts/newsreader-500.ttf" as="font" type="font/ttf" crossorigin>
  <link rel="stylesheet" href="/style.css">
${extraCss.map((href) => `  <link rel="stylesheet" href="${href}">\n`).join('')}  <meta property="og:type" content="${type}">
  <meta property="og:site_name" content="Viram">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:url" content="${url}">
  <meta property="og:image" content="${ORIGIN}${image}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <script type="module" src="/stores.js"></script>`;
}

export const HEADER = `<!-- header -->
  <a class="skip" href="#main">Skip to content</a>
  <header class="site-header">
    <div class="wrap">
      <a class="brand" href="/" aria-label="Viram home">${MARK} Viram</a>
      <nav class="site-nav" aria-label="Main">
        <a href="/#features">Features</a>
        <a href="/techniques/">Techniques</a>
        <a href="/#faq">FAQ</a>
        <a class="pill" href="/#get">Get Viram</a>
      </nav>
    </div>
  </header>
  <!-- /header -->`;

/** The footer, with a few practices from the library. */
export function footer(techniques) {
  const picks = ['sama-vritti', 'nadi-shodhana', 'bhramari', '4-7-8', 'ujjayi', 'coherent']
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
          <li><a href="/#features">Features</a></li>
          <li><a href="/#faq">Questions</a></li>
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

/** Store buttons; stores.js links them, or shows “Coming soon” until Viram is live there. */
export const STORE_BUTTONS = `<div class="actions" data-stores>
          <a class="button" data-store="app" hidden>Download on the App Store</a>
          <a class="button" data-store="play" hidden>Get it on Google Play</a>
          <span class="soon" data-soon>Coming soon to the App Store and Google Play</span>
        </div>`;
