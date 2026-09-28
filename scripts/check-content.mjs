// Checks the bundled technique library against the content rules that types
// can't express (PRD section 05, FR-01, FR-03, FR-09). Run with `npm run check:content`.
import { LIBRARY } from '../src/content/library.ts';
import { SOURCES } from '../src/content/sources.ts';
import { CUES, cueFor } from '../src/content/voice.ts';
import { planFor as enginePlan, isValidSeconds } from '../src/breathing/rhythm.ts';

const MINUTE_TARGETS = [1, 3, 5, 10];
// About 40 seconds at a calm 120–130 words per minute (brand voice spec).
const INTRO_WORD_LIMIT = 85;
// Treatment, diagnosis, and outcome words are release blockers in copy.
const CLAIM_WORDS =
  /\b(cures?|cured|curing|heals?|healing|treats?|treating|therap(?:y|ies|eutic)|diagnos\w*|prescri\w*|guarantee\w*|proven|detox\w*|boosts?)\b/i;
const TREATMENT = /\btreatments?\b/i;
const NOT_A_TREATMENT = /\b(not|isn't|is not) a treatment\b/i;
// Common romanization only: the bundled fonts lack IAST underdots, so no accented Latin letters.
const ACCENTED_LATIN = /[À-ɏḀ-ỿ]/;

/** Planned rounds and duration for a technique's default target, from the step engine (FR-01). */
export function planFor({ steps, target }) {
  const plan = enginePlan(steps, target);
  return { rounds: plan.rounds, seconds: plan.durationMs / 1000, breathsPerMinute: plan.breathsPerMinute };
}

function copyOf(technique) {
  const { guidance, practice } = technique;
  return [
    technique.name,
    technique.subtitle,
    guidance.lead,
    guidance.takeCareShort,
    ...guidance.howTo,
    guidance.context,
    ...guidance.takeCare,
    guidance.research,
    ...guidance.introduction.lines,
    ...practice.steps.map((step) => step.caption),
  ];
}

export function checkLibrary() {
  const errors = [];
  const fail = (where, message) => errors.push(`${where}: ${message}`);
  const ids = new Set();
  const usedSources = new Set();

  for (const technique of LIBRARY) {
    const at = technique.id;
    const { practice, guidance, pronunciation, review } = technique;

    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(at) || at.length > 24) fail(at, 'id must be short kebab-case');
    if (ids.has(at)) fail(at, 'duplicate id');
    ids.add(at);
    if (!Number.isInteger(technique.contentVersion) || technique.contentVersion < 1) fail(at, 'contentVersion must be a positive integer');
    if (technique.riskTier !== 'gentle') fail(at, 'only gentle techniques ship in v1.x');
    if (!technique.shareable) fail(at, 'gentle techniques are shareable');

    // Steps and target (FR-01).
    const { steps, increment, target } = practice;
    if (steps.length < 2 || steps.length > 8) fail(at, 'a practice has 2–8 steps');
    for (const [i, step] of steps.entries()) {
      const where = `${at} step ${i + 1}`;
      const breathing = step.kind === 'inhale' || step.kind === 'exhale';
      if (!isValidSeconds(step.kind, step.seconds, increment)) fail(where, `${step.kind} must be within bounds in steps of ${increment} s`);
      if (step.cue === 'hum' && step.kind !== 'exhale') fail(where, 'Hum is an exhale');
      if ((step.side || step.route) && !breathing) fail(where, 'only inhale and exhale take a side or route');
      if (step.side && step.route) fail(where, 'a side step breathes through the nose');
      if (!step.caption || step.caption.length > 80) fail(where, 'caption must be 1–80 characters');
      for (const round of [1, 2]) if (!CUES[cueFor(step, round)]) fail(where, 'no voice cue for this step');
    }
    if (!steps.some((s) => s.kind === 'inhale') || !steps.some((s) => s.kind === 'exhale')) fail(at, 'needs an inhale and an exhale');
    const breathingSteps = steps.filter((s) => s.kind === 'inhale' || s.kind === 'exhale');
    if (breathingSteps.some((s) => s.side) && !breathingSteps.every((s) => s.side)) fail(at, 'side labels must cover every inhale and exhale');
    if ('minutes' in target && !MINUTE_TARGETS.includes(target.minutes)) fail(at, 'minutes target must be 1, 3, 5, or 10');
    if ('rounds' in target && !(Number.isInteger(target.rounds) && target.rounds >= 1 && target.rounds <= 108)) fail(at, 'rounds target must be 1–108');

    // Names and pronunciation (FR-09).
    if (pronunciation) {
      if (!/^[A-Za-z -]+$/.test(technique.name)) fail(at, 'Sanskrit names use plain romanization');
      if (!/^[A-Za-z]+(-[A-Za-z]+)*( [A-Za-z]+(-[A-Za-z]+)*)*$/.test(pronunciation.respelling)) fail(at, 'respelling must be plain letters and hyphens');
      if (!/[A-Z]{2}/.test(pronunciation.respelling)) fail(at, 'respelling marks stress in capitals');
      if (pronunciation.clip !== `name.${at}`) fail(at, `pronunciation clip must be name.${at}`);
      if (!/^[ऀ-ॿ ]+$/.test(pronunciation.devanagari)) fail(at, 'devanagari must be Devanagari');
    } else if (technique.family === 'classical') {
      fail(at, 'classical techniques need a pronunciation');
    }

    // Guidance and sources (FR-09, content governance).
    if (guidance.lead.length > 180) fail(at, 'lead must be at most 180 characters');
    if (guidance.takeCareShort.length > 90) fail(at, 'takeCareShort must be at most 90 characters');
    if (guidance.howTo.length < 3 || guidance.howTo.length > 7) fail(at, 'howTo has 3–7 steps');
    if (guidance.takeCare.length < 2 || guidance.takeCare.length > 6) fail(at, 'takeCare has 2–6 items');
    if (!guidance.context.trim() || !guidance.research.trim()) fail(at, 'context and research are required');
    const kinds = new Set();
    for (const id of guidance.basedOn) {
      if (!SOURCES[id]) fail(at, `unknown source ${id}`);
      else kinds.add(SOURCES[id].kind === 'study' ? 'study' : 'teaching');
      usedSources.add(id);
    }
    if (!kinds.has('study') || !kinds.has('teaching')) fail(at, 'basedOn needs a text, book, or guide and a published study');
    if (guidance.introduction.clip !== `intro.${at}`) fail(at, `introduction clip must be intro.${at}`);
    const introWords = guidance.introduction.lines.join(' ').split(/\s+/).length;
    if (introWords > INTRO_WORD_LIMIT) fail(at, `introduction is ${introWords} words; limit ${INTRO_WORD_LIMIT}`);

    // Copy rules.
    for (const text of copyOf(technique)) {
      if (CLAIM_WORDS.test(text)) fail(at, `claim word in “${text}”`);
      if (TREATMENT.test(text) && !NOT_A_TREATMENT.test(text)) fail(at, `“treatment” only as “not a treatment”: “${text}”`);
      if (/reviewed by/i.test(text)) fail(at, '“Reviewed by” renders only from a review record');
      if (ACCENTED_LATIN.test(text)) fail(at, `accented letters in “${text}”`);
    }

    // Review (FR-09): a record must be complete and match the content version.
    if (review) {
      if (!review.reviewer || !review.credential || !/^\d{4}-\d{2}-\d{2}$/.test(review.date)) fail(at, 'review needs reviewer, credential, and ISO date');
      if (review.contentVersion !== technique.contentVersion) fail(at, 'review is for another content version');
    }
  }

  for (const [id, source] of Object.entries(SOURCES)) {
    if (!usedSources.has(id)) fail(id, 'source is not cited by any technique');
    if (source.kind === 'study' && !source.doi && !source.pmid) fail(id, 'studies need a DOI or PMID');
  }
  for (const [id, cue] of Object.entries(CUES)) {
    if (cue.text.split(' ').length === 1 && cue.maxSeconds > 0.8) fail(id, 'cue words are at most 0.8 s');
  }
  return errors;
}

if (import.meta.main) {
  const errors = checkLibrary();
  const clock = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
  for (const technique of LIBRARY) {
    const plan = planFor(technique.practice);
    const rhythm = technique.practice.steps.map((s) => s.seconds).join(' · ');
    console.log(
      `${technique.id.padEnd(16)} ${rhythm.padEnd(22)} ${String(plan.rounds).padStart(3)} rounds · ${clock(plan.seconds)} · ${+plan.breathsPerMinute.toFixed(1)} breaths/min`,
    );
  }
  if (errors.length) {
    console.error(`\n${errors.length} content problem(s):\n- ${errors.join('\n- ')}`);
    process.exit(1);
  }
  console.log(`\n${LIBRARY.length} techniques and ${Object.keys(SOURCES).length} sources pass the content rules.`);
}
