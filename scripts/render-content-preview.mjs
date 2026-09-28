// Renders the bundled technique library as a readable review page, so the
// owner, the voice listener, and any instructor review exactly what ships.
// Run with `npm run content:preview`; it refuses to render content that fails the checks.
import { writeFileSync } from 'node:fs';
import { checkLibrary, planFor } from './check-content.mjs';
import { LIBRARY } from '../src/content/library.ts';
import { SOURCES } from '../src/content/sources.ts';
import { CUES, cueFor } from '../src/content/voice.ts';

const OUTPUT = 'docs/content/library-preview.html';
const WORDS_PER_MINUTE = 125;

const errors = checkLibrary();
if (errors.length) {
  console.error(`Fix the content first (npm run check:content):\n- ${errors.join('\n- ')}`);
  process.exit(1);
}

const esc = (text) =>
  String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const clock = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
const list = (items, tag = 'ul') => `<${tag}>${items.map((item) => `<li>${esc(item)}</li>`).join('')}</${tag}>`;

const STEP_LABEL = { inhale: 'Inhale', hold: 'Hold', exhale: 'Exhale', rest: 'Rest' };
const stepLabel = (step) =>
  [step.cue ? { hum: 'Hum', om: 'Om', 'top-up': 'Top up' }[step.cue] : STEP_LABEL[step.kind], step.side, step.route === 'mouth' ? '· mouth' : '']
    .filter(Boolean)
    .join(' ');

function sourceLine(id) {
  const s = SOURCES[id];
  const link = s.doi ? `https://doi.org/${s.doi}` : s.pmid ? `https://pubmed.ncbi.nlm.nih.gov/${s.pmid}/` : s.url;
  const title = link ? `<a href="${esc(link)}">${esc(s.title)}</a>` : esc(s.title);
  return `${esc(s.authors)} (${esc(s.year)}). <cite>${title}</cite>${s.venue ? `. ${esc(s.venue)}` : ''}.`;
}

function renderTechnique(t) {
  const plan = planFor(t.practice);
  const { steps, target, posture, increment } = t.practice;
  const holds = steps.some((s) => (s.kind === 'hold' || s.kind === 'rest') && s.seconds > 0);
  const chips = [t.riskTier === 'gentle' ? 'Gentle' : t.riskTier, posture === 'seated' ? 'Seated' : 'Seated or lying', holds ? 'Short holds' : 'No breath holds'];
  const targetText = 'minutes' in target ? `${target.minutes} min` : `${target.rounds} rounds`;
  const introWords = t.guidance.introduction.lines.join(' ').split(/\s+/).length;
  const cueCell = (step) => {
    const first = CUES[cueFor(step, 1)].text;
    const later = CUES[cueFor(step, 2)].text;
    return first === later ? `“${esc(first)}”` : `“${esc(first)}” (round 1), then “${esc(later)}”`;
  };
  return `<article class="technique" id="${esc(t.id)}">
  <div class="kicker">${t.family === 'classical' ? 'Classical pranayama' : 'Modern pattern'} · <code>${esc(t.id)}</code> · content v${t.contentVersion}</div>
  <h2>${esc(t.name)}</h2>
  <p class="subtitle">${esc(t.subtitle)}</p>
  ${t.pronunciation ? `<p class="say"><span class="play">▶ Hear it</span> ${esc(t.pronunciation.respelling)} <span lang="sa">${esc(t.pronunciation.devanagari)}</span></p>` : ''}
  <p class="chips">${chips.map((c) => `<span>${esc(c)}</span>`).join('')}</p>
  <div class="rhythm"><strong>${steps.map((s) => s.seconds || 'Off').join(' · ')}</strong> <span>${targetText} · ${plan.rounds} rounds · ${clock(plan.seconds)} · guided ${+plan.breathsPerMinute.toFixed(1)} breaths/min${increment === 0.5 ? ' · half-second steps' : ''}</span></div>
  <p class="care-short"><strong>Take care:</strong> ${esc(t.guidance.takeCareShort)}</p>
  <p class="lead">${esc(t.guidance.lead)}</p>
  <div class="cols">
    <section><h3>How to</h3>${list(t.guidance.howTo, 'ol')}</section>
    <section><h3>During practice</h3><table><thead><tr><th>Step</th><th>s</th><th>Caption</th><th>Voice</th></tr></thead><tbody>${steps
      .map((s) => `<tr><td>${esc(stepLabel(s))}</td><td>${s.seconds || 'Off'}</td><td>${esc(s.caption)}</td><td>${cueCell(s)}</td></tr>`)
      .join('')}</tbody></table></section>
  </div>
  <section><h3>${t.family === 'classical' ? 'Traditionally' : 'Where it comes from'}</h3><p>${esc(t.guidance.context)}</p></section>
  <section class="care"><h3>Take care</h3>${list(t.guidance.takeCare)}</section>
  <section><h3>What research says</h3><p>${esc(t.guidance.research)}</p></section>
  <section><h3>Based on</h3><ul class="sources">${t.guidance.basedOn.map((id) => `<li>${sourceLine(id)}</li>`).join('')}</ul></section>
  <section class="intro"><h3>Spoken introduction <span>${introWords} words · about ${Math.round((introWords / WORDS_PER_MINUTE) * 60)} s · <code>${esc(t.guidance.introduction.clip)}</code></span></h3>${list(t.guidance.introduction.lines)}</section>
  <p class="review">${t.review ? `Reviewed by ${esc(t.review.reviewer)}, ${esc(t.review.credential)} (${esc(t.review.date)})` : 'No review recorded. “Reviewed by” is not shown.'}</p>
</article>`;
}

const byKind = (kind) =>
  Object.keys(SOURCES)
    .filter((id) => SOURCES[id].kind === kind)
    .map((id) => `<li>${sourceLine(id)}</li>`)
    .join('');

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>Viram Library Preview</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&family=Newsreader:opsz,wght@6..72,500;6..72,600&display=swap" rel="stylesheet">
<style>
:root{--pine:#12372f;--sky:#a8cfd0;--mist:#eef4ef;--coral:#e46f51;--clay:#983f2c;--paper:#fbfcf8;--ink:#17231f;--muted:#56625d;--line:#d9e1dc}
*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font:16px/1.55 'DM Sans',system-ui,sans-serif}
a{color:var(--pine)}code{font:13px ui-monospace,Menlo,monospace}
header,main,footer{max-width:980px;margin:auto;padding:0 16px}
header{padding-top:48px;padding-bottom:24px;border-bottom:1px solid var(--line)}
h1,h2{font-family:Newsreader,Georgia,serif;font-weight:600;letter-spacing:-.01em;margin:0}
h1{font-size:clamp(32px,6vw,48px);color:var(--pine)}header p{color:var(--muted);max-width:720px}
nav{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px}nav a{font-size:14px;text-decoration:none;padding:6px 12px;border:1px solid var(--line);border-radius:999px;background:#fff}
.technique{padding:40px 0;border-bottom:1px solid var(--line)}
.kicker{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}.kicker code{text-transform:none;letter-spacing:0}
h2{font-size:clamp(28px,5vw,38px);color:var(--pine);margin-top:6px}.subtitle{margin:2px 0 8px;font-size:18px;color:var(--muted)}
.say{margin:0 0 10px;font-weight:500}.say .play{color:var(--pine);border:1px solid var(--line);border-radius:999px;padding:2px 10px;margin-right:6px;font-size:14px}.say [lang]{color:var(--muted);margin-left:6px;white-space:nowrap}
.chips{display:flex;flex-wrap:wrap;gap:6px}.chips span{font-size:13px;background:var(--mist);color:var(--pine);border-radius:999px;padding:3px 10px}
.lead{font-size:18px;max-width:720px}
.rhythm{background:var(--pine);color:var(--paper);border-radius:14px;padding:14px 18px;margin:12px 0}.rhythm strong{font:600 22px Newsreader,serif;margin-right:10px}.rhythm span{color:var(--sky);font-size:14px}
.care-short{border-left:4px solid var(--coral);background:#fff;padding:10px 14px;border-radius:0 10px 10px 0}
.cols{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.2fr);gap:24px}@media(max-width:760px){.cols{grid-template-columns:1fr}}
h3{font:600 15px 'DM Sans',sans-serif;letter-spacing:.04em;text-transform:uppercase;color:var(--pine);margin:22px 0 8px}h3 span{font-weight:400;text-transform:none;letter-spacing:0;color:var(--muted);font-size:13px;margin-left:6px}
ol,ul{padding-left:22px;margin:0}li{margin:4px 0}
table{width:100%;border-collapse:collapse;font-size:14px;background:#fff;border:1px solid var(--line);border-radius:10px;overflow:hidden;display:block;overflow-x:auto}
th,td{text-align:left;padding:7px 9px;border-bottom:1px solid var(--line);vertical-align:top}th{background:var(--mist);font-weight:600}
.care ul{list-style:none;padding:0}.care li{padding-left:18px;position:relative}.care li:before{content:"";position:absolute;left:0;top:.6em;width:8px;height:8px;border-radius:50%;background:var(--coral)}
.sources{font-size:14px;color:var(--muted)}.intro ul{list-style:none;padding:12px 16px;background:#fff;border:1px solid var(--line);border-radius:10px}.intro li{font-family:Newsreader,serif;font-size:18px}
.review{font-size:13px;color:var(--muted)}
footer{padding:40px 16px 64px}footer h2{font-size:28px;margin-top:28px}footer ul{font-size:14px}
</style>
</head>
<body>
<header>
<h1>Library preview</h1>
<p>The ${LIBRARY.length} v1.0 techniques exactly as bundled in <code>src/content/library.ts</code>. Generated by <code>npm run content:preview</code>; don’t edit this file by hand. Research notes, source checks, and open questions are in <a href="technique-research.md">technique-research.md</a>. Voice clips don’t exist yet: “Hear it” and the introduction show the scripts that will be generated.</p>
<nav>${LIBRARY.map((t) => `<a href="#${esc(t.id)}">${esc(t.name)}</a>`).join('')}<a href="#sources">Sources</a><a href="#voice">Voice cues</a></nav>
</header>
<main>
${LIBRARY.map(renderTechnique).join('\n')}
</main>
<footer>
<h2 id="sources">Sources</h2>
<p>Settings → About lists these in two groups.</p>
<h3>Books and classical texts</h3><ul>${byKind('text')}${byKind('book')}${byKind('guide')}</ul>
<h3>Published studies</h3><ul>${byKind('study')}</ul>
<h2 id="voice">Voice cues</h2>
<p>Cue clips are generated once, measured, and bundled. A step shorter than its cue plus 0.2 s plays its tone instead.</p>
<table><thead><tr><th>Clip</th><th>Script</th><th>Longest</th></tr></thead><tbody>${Object.entries(CUES)
  .map(([id, cue]) => `<tr><td><code>cue.${esc(id)}</code></td><td>${esc(cue.text)}</td><td>${cue.maxSeconds} s</td></tr>`)
  .join('')}</tbody></table>
</footer>
</body>
</html>
`;

writeFileSync(OUTPUT, html);
console.log(`wrote ${OUTPUT}`);
