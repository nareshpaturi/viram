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

console.log(
  `Theme contrast passed: ${normalTextPairs.length} normal-text, ${largePhaseNumberPairs.length} large phase-number, and ${nonTextPairs.length} non-text pairs; night ${nightTextPairs.length} text, ${nightLargePairs.length} large, and ${nightNonTextPairs.length} non-text pairs.`,
);
