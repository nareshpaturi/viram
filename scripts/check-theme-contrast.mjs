import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const theme = readFileSync(new URL('../src/theme.ts', import.meta.url), 'utf8');

function color(token) {
  const match = theme.match(new RegExp(`\\b${token}: '(#[0-9A-Fa-f]{6})'`));
  assert(match, `Missing solid hex token: ${token}`);
  return match[1];
}

function luminance(hex) {
  const channels = hex
    .slice(1)
    .match(/../g)
    .map((value) => Number.parseInt(value, 16) / 255)
    .map((value) =>
      value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
    );
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(foreground, background) {
  const a = luminance(color(foreground));
  const b = luminance(color(background));
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

const normalTextPairs = [
  ['ink', 'paper'],
  ['ink', 'white'],
  ['ink', 'mist'],
  ['inkSoft', 'paper'],
  ['inkSoft', 'white'],
  ['inkSoft', 'mist'],
  ['inkFaint', 'paper'],
  ['inkFaint', 'white'],
  ['white', 'pine'],
  ['practiceTextMuted', 'pine'],
  ['coralDeep', 'paper'],
  ['coralDeep', 'white'],
  ['success', 'mist'],
  ['primary', 'paper'],
  ['clay', 'paper'],
  ['clay', 'white'],
  ['pine', 'mist'],
  ['pineDark', 'coral'],
];

const largePhaseNumberPairs = [
  ['pine', 'sky'],
  ['pine', 'saffron'],
  ['pine', 'coral'],
  ['pine', 'mist'],
];

const nonTextPairs = [
  ['focus', 'paper'],
  // Control outlines (buttons, steppers, segmented options) need 3:1.
  ['outline', 'paper'],
  ['outline', 'white'],
];

for (const [foreground, background] of normalTextPairs) {
  const ratio = contrast(foreground, background);
  assert(
    ratio >= 4.5,
    `${foreground} on ${background} is ${ratio.toFixed(2)}:1; expected at least 4.5:1`,
  );
}

for (const [foreground, background] of largePhaseNumberPairs) {
  const ratio = contrast(foreground, background);
  assert(
    ratio >= 3,
    `${foreground} on ${background} is ${ratio.toFixed(2)}:1; expected at least 3:1`,
  );
}

for (const [foreground, background] of nonTextPairs) {
  const ratio = contrast(foreground, background);
  assert(
    ratio >= 3,
    `${foreground} on ${background} is ${ratio.toFixed(2)}:1; expected at least 3:1`,
  );
}

// Night practice (FR-23): lower-contrast labels that still pass AA, and a
// dimmer guide whose count stays as legible as the day guide's.
const night = readFileSync(new URL('../src/night/surface.tsx', import.meta.url), 'utf8');

function nightColor(token) {
  const match = night.match(new RegExp(`\\b${token}: '(#[0-9A-Fa-f]{6})'`));
  assert(match, `Missing night hex token: ${token}`);
  return match[1];
}

const nightTextPairs = [
  ['text', 'background'],
  ['textStrong', 'background'],
  ['textMuted', 'background'],
  ['accent', 'background'],
  ['danger', 'background'],
  ['text', 'card'],
  ['textMuted', 'card'],
  ['accent', 'card'],
  ['text', 'cardMuted'],
  ['textMuted', 'cardMuted'],
  ['textStrong', 'button'],
];
const nightLargePairs = [
  ['count', 'inhale'],
  ['count', 'hold'],
  ['count', 'exhale'],
  ['count', 'rest'],
];
const nightNonTextPairs = [['buttonBorder', 'background']];

for (const [pairs, minimum] of [
  [nightTextPairs, 4.5],
  [nightLargePairs, 3],
  [nightNonTextPairs, 3],
]) {
  for (const [foreground, background] of pairs) {
    const a = luminance(nightColor(foreground));
    const b = luminance(nightColor(background));
    const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    assert(ratio >= minimum, `night ${foreground} on ${background} is ${ratio.toFixed(2)}:1; expected at least ${minimum}:1`);
  }
}

// Soft Light: text and outlines that sit directly on a wash. The glows peak
// darker than a wash's stops, so each wash is rendered on a 41 × 41 grid
// from the same data the app draws (src/light/washes.ts) and every point
// must pass: ink and muted-on-wash 4.5:1, outlines-on-wash 3:1.
const { WASHES, PLATE, PROGRAM_LIGHT, BLOOM, angleLine } = await import('../src/light/washes.ts');

const rgb = (hex) => [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16));
const lumOf = (c) => {
  const [r, g, b] = c.map((v) => v / 255).map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratioOf = (a, b) => (Math.max(lumOf(a), lumOf(b)) + 0.05) / (Math.min(lumOf(a), lumOf(b)) + 0.05);

/** A gradient's color and opacity at t, interpolating between stops as SVG does. */
function sample(stops, t) {
  const first = stops[0];
  const last = stops[stops.length - 1];
  if (t <= first.offset) return { color: rgb(first.color), opacity: first.opacity ?? 1 };
  if (t >= last.offset) return { color: rgb(last.color), opacity: last.opacity ?? 1 };
  for (let i = 1; i < stops.length; i++) {
    const a = stops[i - 1];
    const b = stops[i];
    if (t > b.offset) continue;
    const f = (t - a.offset) / (b.offset - a.offset || 1);
    return {
      color: rgb(a.color).map((v, k) => v + (rgb(b.color)[k] - v) * f),
      opacity: (a.opacity ?? 1) + ((b.opacity ?? 1) - (a.opacity ?? 1)) * f,
    };
  }
}

/** The rendered color of a wash at (x, y), as fractions of the surface. */
function washAt(wash, x, y) {
  const line = angleLine(wash.angle);
  const dx = line.x2 - line.x1;
  const dy = line.y2 - line.y1;
  const t = Math.max(0, Math.min(1, ((x - line.x1) * dx + (y - line.y1) * dy) / (dx * dx + dy * dy)));
  let color = sample(wash.base, t).color;
  for (const glow of wash.glows) {
    const s = sample(glow.stops, Math.hypot((x - glow.cx) / glow.rx, (y - glow.cy) / glow.ry));
    color = color.map((v, i) => v * (1 - s.opacity) + s.color[i] * s.opacity);
  }
  return color;
}

const lit = { dawn: WASHES.dawn, day: WASHES.day, dusk: WASHES.dusk, 'technique plate': PLATE };
for (const [id, wash] of Object.entries(PROGRAM_LIGHT)) lit[`program ${id}`] = wash;
for (const name of ['dawn', 'day', 'dusk']) lit[`completion ${name}`] = { ...WASHES[name], glows: [...WASHES[name].glows, BLOOM] };

const washChecks = [
  ['ink', 4.5],
  ['inkSoftOnWash', 4.5],
  ['outlineOnWash', 3],
];
for (const [name, wash] of Object.entries(lit)) {
  for (const [token, minimum] of washChecks) {
    let worst = Infinity;
    for (let i = 0; i <= 40; i++) for (let j = 0; j <= 40; j++) worst = Math.min(worst, ratioOf(rgb(color(token)), washAt(wash, i / 40, j / 40)));
    assert(worst >= minimum, `${token} on the ${name} wash falls to ${worst.toFixed(2)}:1; expected at least ${minimum}:1`);
  }
}

console.log(
  `Theme contrast passed: ${normalTextPairs.length} normal-text, ${largePhaseNumberPairs.length} large phase-number, and ${nonTextPairs.length} non-text pairs; night ${nightTextPairs.length} text, ${nightLargePairs.length} large, and ${nightNonTextPairs.length} non-text pairs; ${Object.keys(lit).length} Soft Light washes, ${washChecks.length} roles each.`,
);
