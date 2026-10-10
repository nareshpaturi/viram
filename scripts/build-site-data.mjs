// Builds viram.app's generated files from the app's own content, so the site
// never says anything the app doesn't:
//   site/share/library.js            names and step structure for the share-link page
//   site/techniques/                  a guide page per technique, the index, and orbs.css
//   site/sitemap.xml, llms.txt, llms-full.txt
//   the header, footer, main actions, structured data, a few techniques, and
//   the care notes inside the hand-written pages
// Run with `npm run site:data`; `--check` verifies everything is current (CI).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { LIBRARY } from '../src/content/library.ts';
import { SOURCES } from '../src/content/sources.ts';
import { COMFORT_LINE, GENERAL_TAKE_CARE, WELLNESS_LINE } from '../src/content/safety.ts';
import { PROGRAMS } from '../src/programs/definitions.ts';
import { planFor } from './check-content.mjs';
import { EMAIL, GUIDES_UPDATED, HEADER, LAUNCHED, ORIGIN, STORES, esc, footer, getViram, head } from './lib/site.mjs';

const CHECK = process.argv.includes('--check');
const outputs = new Map();
const write = (path, content) => outputs.set(path, content);
const techniques = LIBRARY.filter((t) => t.riskTier === 'gentle');
const byId = (id) => techniques.find((t) => t.id === id);

/** The beginner path: the order Pranayama Foundations teaches, one technique at a time. */
const FOUNDATIONS = PROGRAMS.find((p) => p.id === 'foundations');
const PATH = FOUNDATIONS.sessions
  .filter((s) => s.parts.length === 1)
  .map((s) => byId(s.parts[0].techniqueId))
  .filter(Boolean);

// ---------------------------------------------------------------------------
// Words, as the app says them (src/breathing/describe.ts).

const LINE_WORD = { inhale: 'In', hold: 'Hold', exhale: 'Out', rest: 'Rest' };
const CUE_WORD = { hum: 'Hum', om: 'Om', 'top-up': 'Top up' };
const KIND_LABEL = { inhale: 'Inhale', hold: 'Hold after inhale', exhale: 'Exhale', rest: 'Rest' };
const ORB_WORD = { inhale: 'Inhale', hold: 'Hold', exhale: 'Exhale', rest: 'Rest' };

const isAlternateNostril = (steps) =>
  steps.length === 4 &&
  steps.map((s) => s.kind).join() === 'inhale,exhale,inhale,exhale' &&
  steps[0].side !== undefined &&
  steps[0].side !== steps[1].side &&
  steps[1].side === steps[2].side &&
  steps[2].side !== steps[3].side &&
  steps[0].seconds === steps[2].seconds &&
  steps[1].seconds === steps[3].seconds;

/** Breathe's rhythm line: “In 4 · Hold 4 · Out 4 · Rest 4”, “In 4 · Out 6, each side”. */
function rhythmLine(steps) {
  if (isAlternateNostril(steps)) return `In ${steps[0].seconds} · Out ${steps[1].seconds}, each side`;
  return steps
    .filter((s) => s.seconds > 0)
    .map((s) => `${s.cue ? CUE_WORD[s.cue] : LINE_WORD[s.kind]} ${s.seconds}${s.side ? ` ${s.side}` : ''}`)
    .join(' · ');
}

const stepLabel = (s) => (s.cue ? CUE_WORD[s.cue] : s.side ? `${KIND_LABEL[s.kind]} ${s.side}` : KIND_LABEL[s.kind]);
const targetText = (target) => ('minutes' in target ? `${target.minutes} min` : `${target.rounds} ${target.rounds === 1 ? 'round' : 'rounds'}`);
const clock = (seconds) => `${Math.floor(seconds / 60)}:${String(Math.round(seconds % 60)).padStart(2, '0')}`;
const pace = (bpm) => `${+bpm.toFixed(1)} breaths a minute`;
/** “5 min · 19 rounds · 5:04”, or “4 rounds · 1:16” for a practice set in rounds. */
const planLine = (target, plan) => `${'minutes' in target ? `${target.minutes} min · ` : ''}${plan.rounds} rounds · ${clock(plan.seconds)}`;
const holds = (t) => t.practice.steps.some((s) => (s.kind === 'hold' || s.kind === 'rest') && s.seconds > 0);
const familyLabel = (t) => (t.family === 'classical' ? 'Classical pranayama' : 'Modern breathing pattern');
const plain = (t) => `${t.name} (${t.subtitle.toLowerCase()})`;

function sourceLink(s) {
  return s.doi ? `https://doi.org/${s.doi}` : s.pmid ? `https://pubmed.ncbi.nlm.nih.gov/${s.pmid}/` : s.url;
}

function sourceHtml(id) {
  const s = SOURCES[id];
  const link = sourceLink(s);
  const title = link ? `<a href="${esc(link)}" rel="noopener">${esc(s.title)}</a>` : esc(s.title);
  return `${esc(s.authors)} (${esc(s.year)}). <cite>${title}</cite>${s.venue ? `. ${esc(s.venue)}` : ''}.`;
}

function sourceText(id) {
  const s = SOURCES[id];
  const link = sourceLink(s);
  return `${s.authors} (${s.year}). ${s.title}${s.venue ? `. ${s.venue}` : ''}.${link ? ` ${link}` : ''}`;
}

const dots = (steps) =>
  `<span class="dots" aria-hidden="true">${steps
    .filter((s) => s.seconds > 0)
    .map((s) => `<i class="dot-${s.kind}"></i>`)
    .join('')}</span>`;

const jsonLd = (data) => `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;

// ---------------------------------------------------------------------------
// The breathing orb, timed by each technique's real rhythm.

const PHASE = { inhale: '#A8CFD0', hold: '#E4B84A', exhale: '#E46F51', rest: '#CFDCD3' };
const SMALL = 0.62;
const FULL = 1;
const pct = (x) => `${+x.toFixed(3)}%`;

function orbCss(t) {
  const steps = t.practice.steps.filter((s) => s.seconds > 0);
  const total = steps.reduce((sum, s) => sum + s.seconds, 0);
  // Inhales grow (a top-up finishes the breath), exhales shrink, holds stay.
  const targets = [];
  let scale = SMALL;
  for (let pass = 0; pass < 2; pass++) {
    targets.length = 0;
    steps.forEach((s, i) => {
      const next = steps[(i + 1) % steps.length];
      if (s.kind === 'inhale') scale = next.kind === 'inhale' ? 0.88 : FULL;
      else if (s.kind === 'exhale') scale = SMALL;
      targets.push(scale);
    });
  }
  const start = targets[targets.length - 1];
  const ease = 'animation-timing-function: cubic-bezier(0.25, 0.1, 0.25, 1)';
  const name = `orb-${t.id}`;
  const disc = [`  0% { transform: scale(${start}); ${ease}; }`];
  const halo = [];
  const labels = [];
  const blend = (0.6 / total) * 100;
  const fade = (0.35 / total) * 100;
  let at = 0;
  steps.forEach((s, i) => {
    const from = (at / total) * 100;
    at += s.seconds;
    const to = (at / total) * 100;
    disc.push(`  ${pct(to)} { transform: scale(${targets[i]}); ${ease}; }`);
    halo.push(`  ${pct(from)}, ${pct(Math.max(from, to - blend))} { background-color: ${PHASE[s.kind]}; }`);
    // Each label fades in as its step starts and out as it ends.
    const show = [
      from > 0 ? `  0%, ${pct(from)} { opacity: 0; }` : '  0% { opacity: 0; }',
      `  ${pct(from + fade)}, ${pct(to - fade)} { opacity: 1; }`,
      to < 100 ? `  ${pct(to)}, 100% { opacity: 0; }` : '  100% { opacity: 0; }',
    ];
    labels.push(`@keyframes ${name}-l${i + 1} {\n${show.join('\n')}\n}`);
  });
  halo.push(`  100% { background-color: ${PHASE[steps[0].kind]}; }`);
  const run = (n) => `${n} ${total}s linear infinite`;
  const on = `.orb-play:checked ~ .orb--${t.id}`;
  return `/* ${t.name}: ${rhythmLine(t.practice.steps)} (${total} s a round) */
${on} .orb__disc { animation: ${name} ${total}s infinite; }
${on} .orb__halo { animation: ${run(`${name}-halo`)}; }
${steps.map((_, i) => `${on} .orb__labels li:nth-child(${i + 1}) { animation: ${run(`${name}-l${i + 1}`)}; }`).join('\n')}
@keyframes ${name} {
${disc.join('\n')}
}
@keyframes ${name}-halo {
${halo.join('\n')}
}
${labels.join('\n')}
`;
}

/**
 * The orb for a technique: still until the reader starts it, and stopped as
 * easily (WCAG 2.2.2), with the technique's short care note beside it. A
 * checkbox does it, so it works without JavaScript.
 */
function orbDemo(t) {
  const steps = t.practice.steps.filter((s) => s.seconds > 0);
  const id = `orb-play-${t.id}`;
  return `<div class="orb-demo">
          <input type="checkbox" class="orb-play" id="${id}">
          <div class="orb orb--${t.id}" role="img" aria-label="Breathing guide for ${esc(t.name)}: ${esc(rhythmLine(t.practice.steps))}">
            <div class="orb__halo"></div>
            <div class="orb__disc"></div>
            <ol class="orb__labels" aria-hidden="true">
${steps.map((s) => `              <li>${esc(s.cue ? CUE_WORD[s.cue] : ORB_WORD[s.kind])}<span>${s.side ? `${esc(s.side)} · ` : ''}${s.seconds} seconds</span></li>`).join('\n')}
            </ol>
            <p class="orb__still" aria-hidden="true">${esc(rhythmLine(t.practice.steps))}</p>
          </div>
          <label class="button secondary orb-toggle" for="${id}"><span class="when-off">Breathe along</span><span class="when-on">Stop</span></label>
          <p class="orb-care"><strong>Take care:</strong> ${esc(t.guidance.takeCareShort)}</p>
        </div>`;
}

write('site/techniques/orbs.css', `/* Generated by scripts/build-site-data.mjs from src/content/library.ts. Do not edit. */\n${techniques.map(orbCss).join('\n')}`);

// ---------------------------------------------------------------------------
// Technique pages.

function card(t, { kicker = t.family === 'classical' ? 'Classical' : 'Modern', english = false } = {}) {
  const [title, sub] = english && t.name !== t.subtitle ? [t.subtitle, t.name] : [t.name, t.subtitle];
  return `<li><a class="technique-card" href="/techniques/${t.id}/">
          <span class="kind">${esc(kicker)}</span>
          <strong>${esc(title)}</strong>
          <span class="sub">${esc(sub)}</span>
          <span class="rhythm">${dots(t.practice.steps)}${esc(rhythmLine(t.practice.steps))}</span>
        </a></li>`;
}

const BYLINE = `Written by Viram from the sources below. Updated <time datetime="${GUIDES_UPDATED.iso}">${GUIDES_UPDATED.text}</time>. <a href="/about/">How we write our guides</a>.`;

const FOOTER = footer(techniques);

function page({ headHtml, body, ld }) {
  return `<!doctype html>
<html lang="en">
<head>
  ${headHtml}
  ${ld.map(jsonLd).join('\n  ')}
</head>
<body>
  ${HEADER}
  <main id="main">
${body}
  </main>
  ${FOOTER}
</body>
</html>
`;
}

function techniquePage(t) {
  const plan = planFor(t.practice);
  const { steps, target, posture } = t.practice;
  const g = t.guidance;
  const line = rhythmLine(steps);
  const path = `/techniques/${t.id}/`;
  const aka = t.aliases?.length ? ` Also called ${t.aliases.join(', ')}.` : '';
  const description = `How to practise ${plain(t)}: ${line}. Step-by-step guide with care notes and sources.${aka}`;
  const related = techniques.filter((o) => o.id !== t.id && o.family === t.family).slice(0, 3);
  const step = PATH.indexOf(t);
  const next = step >= 0 ? PATH[step + 1] : null;
  const facts = [
    familyLabel(t),
    posture === 'seated' ? 'Seated' : 'Seated or lying',
    holds(t) ? 'Short holds' : 'No breath holds',
    `${targetText(target)} to start`,
  ];
  const ld = [
    {
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      name: `How to practise ${plain(t)}`,
      description: g.lead,
      inLanguage: 'en',
      url: `${ORIGIN}${path}`,
      totalTime: `PT${Math.round(plan.seconds)}S`,
      dateModified: GUIDES_UPDATED.iso,
      author: { '@type': 'Organization', name: 'Viram', url: `${ORIGIN}/about/` },
      ...(t.aliases?.length ? { alternateName: t.aliases } : {}),
      step: g.howTo.map((text, i) => ({ '@type': 'HowToStep', position: i + 1, text })),
      citation: g.basedOn.map((id) => {
        const s = SOURCES[id];
        const link = sourceLink(s);
        return { '@type': 'CreativeWork', name: s.title, author: s.authors, ...(link ? { url: link } : {}) };
      }),
      isPartOf: { '@type': 'WebSite', name: 'Viram', url: ORIGIN },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Viram', item: `${ORIGIN}/` },
        { '@type': 'ListItem', position: 2, name: 'Techniques', item: `${ORIGIN}/techniques/` },
        { '@type': 'ListItem', position: 3, name: t.name, item: `${ORIGIN}${path}` },
      ],
    },
  ];
  const body = `    <section class="guide-hero wash">
      <div class="wrap">
        <div>
          <ol class="crumbs" aria-label="Breadcrumb"><li><a href="/">Viram</a></li><li><a href="/techniques/">Techniques</a></li><li aria-current="page">${esc(t.name)}</li></ol>
          <p class="eyebrow">${familyLabel(t)}</p>
          <h1>${esc(t.name)}</h1>
          <p class="lede">${esc(t.subtitle)}${t.aliases?.length ? `. Also called ${esc(t.aliases.join(', '))}` : ''}.</p>
${t.pronunciation ? `          <p class="say">Say it ${esc(t.pronunciation.respelling)} <span lang="sa">${esc(t.pronunciation.devanagari)}</span></p>\n` : ''}          <ul class="facts">${facts.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>
          <div class="rhythm-card">
            <span class="label">Rhythm in seconds</span>
            <p class="line">${esc(line)}</p>
            <p class="plan">${planLine(target, plan)} · about ${pace(plan.breathsPerMinute)}</p>
          </div>
        </div>
        ${orbDemo(t)}
      </div>
    </section>
    <section class="band">
      <div class="wrap guide">
        <article>
          <p class="lede">${esc(g.lead)}</p>
          <p class="byline">${BYLINE}</p>
          <h2>How to practise ${esc(t.name)}</h2>
          <ol>
${g.howTo.map((step) => `            <li>${esc(step)}</li>`).join('\n')}
          </ol>
          <h2>Each round, step by step</h2>
          <div class="table-scroll" role="region" aria-label="${esc(t.name)}, each round" tabindex="0">
          <table class="step-table">
            <thead><tr><th scope="col">Step</th><th scope="col">Seconds</th><th scope="col">What to do</th></tr></thead>
            <tbody>
${steps.map((s) => `              <tr><td>${dots([s])}${esc(stepLabel(s))}${s.route === 'mouth' ? ' (mouth)' : ''}</td><td>${s.seconds === 0 ? 'Off' : s.seconds}</td><td>${esc(s.caption)}</td></tr>`).join('\n')}
            </tbody>
          </table>
          </div>
          <div class="care">
            <h2>Take care</h2>
            <p><strong>${esc(g.takeCareShort)}</strong></p>
            <ul>
${g.takeCare.map((c) => `              <li>${esc(c)}</li>`).join('\n')}
              <li>${esc(COMFORT_LINE)}</li>
            </ul>
          </div>
          <h2>${t.family === 'classical' ? 'Traditionally' : 'Where it comes from'}</h2>
          <p>${esc(g.context)}</p>
          <h2>What the research says</h2>
          <p>${esc(g.research)}</p>
          <h2>Sources</h2>
          <ol class="sources">
${g.basedOn.map((id) => `            <li>${sourceHtml(id)}</li>`).join('\n')}
          </ol>
          <p class="note small">${esc(WELLNESS_LINE)} Read <a href="/techniques/#safety">practising safely</a> before you begin.</p>
${step >= 0 ? `          <div class="path-note">
            <p class="eyebrow">Beginner path · ${step + 1} of ${PATH.length}</p>
            <p>${next ? `Comfortable with ${esc(t.name)}? Next on the path is <a href="/techniques/${next.id}/">${esc(plain(next))}</a>.` : `That’s the beginner path. <a href="/techniques/">Explore every technique</a>.`} It follows the order of Viram’s Pranayama Foundations program.</p>
          </div>\n` : ''}        </article>
        <aside class="aside-card" aria-label="Practise with Viram">
          <h3>Practise ${esc(t.name)} with Viram</h3>
          <p class="muted">A calm voice or soft tones mark every step, and keep guiding with your phone locked. Free, no account.</p>
          ${getViram({ explore: false })}
        </aside>
      </div>
    </section>
${related.length ? `    <section class="band band--mist">
      <div class="wrap">
        <h2>More ${t.family === 'classical' ? 'classical pranayama' : 'breathing patterns'}</h2>
        <ul class="techniques">
          ${related.map(card).join('\n          ')}
        </ul>
      </div>
    </section>` : ''}`;
  return page({
    headHtml: head({ title: `${t.name}: ${t.subtitle}, step by step · Viram`, description, path, type: 'article', extraCss: ['/techniques/orbs.css'] }),
    body,
    ld,
  });
}

for (const t of techniques) write(`site/techniques/${t.id}/index.html`, techniquePage(t));

// The techniques index.
{
  const groups = [
    ['classical', 'Classical pranayama', 'Breathing practices from the yoga tradition, taught gently and without forceful holds.'],
    ['modern', 'Modern breathing patterns', 'Simple patterns from modern breathing research and practice.'],
  ];
  const body = `    <section class="guide-hero wash">
      <div class="narrow">
        <ol class="crumbs" aria-label="Breadcrumb"><li><a href="/">Viram</a></li><li aria-current="page">Techniques</li></ol>
        <p class="eyebrow">The Viram library</p>
        <h1>Pranayama and breathing techniques</h1>
        <p class="lede">${techniques.length} gentle practices, each with its rhythm, step-by-step instructions, care notes, and the sources behind it. Every one is guided in the Viram app by voice, tones, or haptics.</p>
      </div>
    </section>
    <section class="band" id="start" aria-labelledby="start-title">
      <div class="wrap">
        <div class="section-head"><p class="eyebrow">New to pranayama?</p><h2 id="start-title">Start here, one at a time.</h2><p class="muted">The order Viram’s Pranayama Foundations program teaches. Practise one for a few days before moving on.</p></div>
        <ol class="techniques path">
          ${PATH.map((t, i) => card(t, { kicker: `Step ${i + 1}`, english: true })).join('\n          ')}
        </ol>
      </div>
    </section>
${groups
  .map(
    ([family, title, intro]) => `    <section class="band${family === 'classical' ? ' band--mist' : ''}">
      <div class="wrap">
        <div class="section-head"><h2>${title}</h2><p class="muted">${intro}</p></div>
        <ul class="techniques">
          ${techniques.filter((t) => t.family === family).map(card).join('\n          ')}
        </ul>
      </div>
    </section>`,
  )
  .join('\n')}
    <section class="band band--mist" id="safety" aria-labelledby="safety-title">
      <div class="narrow">
        <p class="eyebrow">Practising safely</p>
        <h2 id="safety-title">Care notes for every technique</h2>
        <p class="muted">Each guide has its own notes too. These apply to all of them.</p>
        <div class="care">
          <ul>
${GENERAL_TAKE_CARE.map((c) => `            <li>${esc(c)}</li>`).join('\n')}
          </ul>
        </div>
        <p class="small muted">${esc(WELLNESS_LINE)}</p>
      </div>
    </section>`;
  write(
    'site/techniques/index.html',
    page({
      headHtml: head({
        title: 'Pranayama and breathing techniques, step by step · Viram',
        description: `Step-by-step guides to ${techniques.length} breathing techniques: ${techniques.map((t) => t.name).join(', ')}. Rhythms, care notes, and sources.`,
        path: '/techniques/',
      }),
      body,
      ld: [
        {
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name: 'Pranayama and breathing techniques',
          itemListElement: techniques.map((t, i) => ({ '@type': 'ListItem', position: i + 1, name: plain(t), url: `${ORIGIN}/techniques/${t.id}/` })),
        },
      ],
    }),
  );
}

// ---------------------------------------------------------------------------
// Hand-written pages: shared header, footer, and the home page's library.

const HAND_WRITTEN = ['site/index.html', 'site/about/index.html', 'site/privacy/index.html', 'site/support/index.html', 'site/404.html', 'site/share/index.html'];

/** The home page's structured data: who makes Viram, and the app once it's in the stores. */
function homeLd() {
  const graph = [
    { '@type': 'Organization', '@id': `${ORIGIN}/#org`, name: 'Viram', url: `${ORIGIN}/`, logo: `${ORIGIN}/img/icon-512.png`, email: EMAIL },
    { '@type': 'WebSite', '@id': `${ORIGIN}/#site`, name: 'Viram', url: `${ORIGIN}/`, publisher: { '@id': `${ORIGIN}/#org` }, inLanguage: 'en' },
  ];
  if (LAUNCHED) {
    graph.push({
      '@type': 'MobileApplication',
      name: 'Viram',
      description: `A free pranayama and breathing app that guides ${techniques.length} gentle techniques by voice, tones, or haptics, keeps guiding with the phone locked, and works offline.`,
      operatingSystem: [STORES.app && 'iOS', STORES.play && 'Android'].filter(Boolean).join(', '),
      applicationCategory: 'HealthApplication',
      url: `${ORIGIN}/`,
      image: `${ORIGIN}/img/icon-512.png`,
      installUrl: [STORES.app, STORES.play].filter(Boolean),
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      publisher: { '@id': `${ORIGIN}/#org` },
    });
  }
  return `<!-- ld -->\n  ${jsonLd({ '@context': 'https://schema.org', '@graph': graph })}\n  <!-- /ld -->`;
}

const ESSENTIAL_CARE = [COMFORT_LINE, ...GENERAL_TAKE_CARE.filter((c) => /chest pain|driving|in or near water|heart or lung/i.test(c))];

function between(text, name, content, path) {
  const open = `<!-- ${name} -->`;
  const close = `<!-- /${name} -->`;
  const from = text.indexOf(open);
  const to = text.indexOf(close);
  if (from < 0 || to < from) throw new Error(`${path} is missing ${open} … ${close}`);
  return text.slice(0, from) + content + text.slice(to + close.length);
}

for (const path of HAND_WRITTEN) {
  let text = readFileSync(path, 'utf8');
  text = between(text, 'header', HEADER, path);
  text = between(text, 'footer', FOOTER, path);
  if (path === 'site/index.html') {
    text = between(text, 'ld', homeLd(), path);
    text = between(text, 'get', `<!-- get -->\n          ${getViram()}\n          <!-- /get -->`, path);
    text = between(text, 'get-end', `<!-- get-end -->\n        ${getViram()}\n        <!-- /get-end -->`, path);
    text = between(text, 'start', `<!-- start -->\n        <ol class="techniques path">\n          ${PATH.slice(0, 3).map((t, i) => card(t, { kicker: i === 0 ? 'Start here' : `Then ${i + 1}`, english: true })).join('\n          ')}\n        </ol>\n        <!-- /start -->`, path);
    text = between(text, 'care', `<!-- care -->\n            <ul>\n${ESSENTIAL_CARE.map((c) => `              <li>${esc(c)}</li>`).join('\n')}\n            </ul>\n            <!-- /care -->`, path);
  }
  if (path === 'site/share/index.html') text = between(text, 'get', `<!-- get -->\n      ${getViram({ explore: false })}\n      <!-- /get -->`, path);
  if (path === 'site/about/index.html') text = between(text, 'updated', `<!-- updated --><time datetime="${GUIDES_UPDATED.iso}">${GUIDES_UPDATED.text}</time><!-- /updated -->`, path);
  write(path, text);
}

// ---------------------------------------------------------------------------
// Share links, sitemap, and files for search and AI assistants.

{
  const shareable = Object.fromEntries(
    LIBRARY.filter((t) => t.shareable && t.riskTier === 'gentle').map((t) => [
      t.id,
      {
        name: t.name,
        subtitle: t.subtitle,
        increment: t.practice.increment,
        steps: t.practice.steps.map((s) => ({ kind: s.kind, ...(s.side ? { side: s.side } : {}), ...(s.cue ? { cue: s.cue } : {}) })),
      },
    ]),
  );
  write('site/share/library.js', `// Generated by scripts/build-site-data.mjs from src/content/library.ts. Do not edit.\nexport const TECHNIQUES = ${JSON.stringify(shareable, null, 2)};\n`);
}

const PAGES = ['/', '/techniques/', ...techniques.map((t) => `/techniques/${t.id}/`), '/about/', '/privacy/', '/support/'];
write(
  'site/sitemap.xml',
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${PAGES.map((p) => `  <url><loc>${ORIGIN}${p}</loc></url>`).join('\n')}\n</urlset>\n`,
);

const SUMMARY = `Viram is a free pranayama (yogic breathing) app for iPhone and Android. It guides ${techniques.length} gentle breathing techniques by voice, tones, or haptics, keeps guiding with the phone locked, works offline, and has no ads, no account, and no tracking.`;

write(
  'site/llms.txt',
  `# Viram

> ${SUMMARY}

Key facts:
- Free, with no ads, subscriptions, or account. Viram doesn't collect practice history; it stays on the phone.
- Techniques: ${techniques.map(plain).join('; ')}.
- Guidance: a calm voice, three tone sets, or phase-by-phase haptics, in step with an on-screen breathing guide. It keeps guiding with the screen locked.
- Practice by minutes (1 to 60) or rounds (1 to 108), adjust any rhythm, save your own, follow a program, and share a practice by link.
- A wellness practice, not medical advice. Every technique carries its own care notes and sources.
- Contact: ${EMAIL}

## Techniques
${techniques.map((t) => `- [${plain(t)}](${ORIGIN}/techniques/${t.id}/): ${rhythmLine(t.practice.steps)} seconds. ${t.guidance.takeCareShort}`).join('\n')}

## About Viram
- [Home](${ORIGIN}/): how a practice works, where to start, and common questions
- [About the guides](${ORIGIN}/about/): how the guides are written, sourced, and reviewed
- [Privacy](${ORIGIN}/privacy/): what the app keeps, all on your device
- [Support](${ORIGIN}/support/): contact and help

## Optional
- [Full technique guides](${ORIGIN}/llms-full.txt): every technique's instructions, care notes, and sources as plain text
`,
);

write(
  'site/llms-full.txt',
  `# Viram: technique guides

> ${SUMMARY}

These are the guides the app shows, with the sources each one is based on. ${WELLNESS_LINE}

## Practising safely
${GENERAL_TAKE_CARE.map((c) => `- ${c}`).join('\n')}

${techniques
  .map((t) => {
    const plan = planFor(t.practice);
    const g = t.guidance;
    return `## ${plain(t)}

URL: ${ORIGIN}/techniques/${t.id}/
${t.aliases?.length ? `Also called: ${t.aliases.join(', ')}\n` : ''}${t.pronunciation ? `Pronunciation: ${t.pronunciation.respelling} (${t.pronunciation.devanagari})\n` : ''}Type: ${familyLabel(t)}
Rhythm (seconds): ${rhythmLine(t.practice.steps)}
Default: ${planLine(t.practice.target, plan)}, about ${pace(plan.breathsPerMinute)}

${g.lead}

### How to practise
${g.howTo.map((s, i) => `${i + 1}. ${s}`).join('\n')}

### Each round
${t.practice.steps.map((s) => `- ${stepLabel(s)}, ${s.seconds === 0 ? 'off' : `${s.seconds} s`}: ${s.caption}`).join('\n')}

### Take care
- ${g.takeCareShort}
${g.takeCare.map((c) => `- ${c}`).join('\n')}

### ${t.family === 'classical' ? 'Traditionally' : 'Where it comes from'}
${g.context}

### What the research says
${g.research}

### Sources
${g.basedOn.map((id) => `- ${sourceText(id)}`).join('\n')}
`;
  })
  .join('\n')}`,
);

// ---------------------------------------------------------------------------

const stale = [];
for (const [path, content] of outputs) {
  const current = existsSync(path) ? readFileSync(path, 'utf8') : null;
  if (current === content) continue;
  if (CHECK) stale.push(path);
  else {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content);
  }
}
if (CHECK) {
  if (stale.length) {
    console.error(`These site files are out of date. Run npm run site:data.\n- ${stale.join('\n- ')}`);
    process.exit(1);
  }
  console.log(`Site files are current (${outputs.size}).`);
} else {
  console.log(`Site files written (${outputs.size}).`);
}
