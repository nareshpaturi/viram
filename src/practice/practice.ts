/**
 * A practice is what Breathe offers and the practice screen runs: a named
 * rhythm and target, from the library, My rhythms, or the custom builder.
 * Library-based practices keep their technique ID, so captions, cues, and
 * Take care always come from the installed library (FR-10).
 */
import { LIBRARY } from '../content/library';
import type { Technique } from '../content/types';
import { checkSlowing, SLOWING_TECHNIQUES, type Increment, type RhythmStep, type Slowing, type Target } from '../breathing/rhythm';
import { findTechnique, validateRhythm } from '../sharing/link';

export type PracticeSource = { kind: 'technique'; id: string } | { kind: 'rhythm'; id: string } | { kind: 'custom' };

export interface Practice {
  source: PracticeSource;
  name: string;
  techniqueId: string | null;
  steps: RhythmStep[];
  target: Target;
  /** Gradual slowing (FR-24), for coherent breathing and custom rhythms only. */
  slowing?: Slowing | null;
}

export const DEFAULT_TECHNIQUE_ID = 'sama-vritti';

export function practiceFromTechnique(technique: Technique): Practice {
  return {
    source: { kind: 'technique', id: technique.id },
    name: technique.name,
    techniqueId: technique.id,
    steps: technique.practice.steps.map(({ caption: _caption, ...step }) => step),
    target: technique.practice.target,
  };
}

/** Sama Vritti at 5 minutes: the ready practice until another is chosen. */
export function defaultPractice(): Practice {
  return practiceFromTechnique(LIBRARY.find((t) => t.id === DEFAULT_TECHNIQUE_ID)!);
}

/** “1-minute box breathing” quick action. */
export function oneMinuteBox(): Practice {
  return { ...defaultPractice(), target: { minutes: 1 } };
}

export function customPractice(): Practice {
  return {
    source: { kind: 'custom' },
    name: 'Custom rhythm',
    techniqueId: null,
    steps: [
      { kind: 'inhale', seconds: 4 },
      { kind: 'hold', seconds: 4 },
      { kind: 'exhale', seconds: 4 },
      { kind: 'rest', seconds: 4 },
    ],
    target: { minutes: 5 },
  };
}

export function techniqueOf(practice: Pick<Practice, 'techniqueId'>): Technique | undefined {
  return practice.techniqueId ? findTechnique(practice.techniqueId) : undefined;
}

/** Library practices may use half seconds where the technique defines them. */
export function incrementOf(practice: Pick<Practice, 'techniqueId'>): Increment {
  return techniqueOf(practice)?.practice.increment ?? 1;
}

/** The step caption shown during practice, from the library only. */
export function captionFor(practice: Practice, index: number): string | null {
  return techniqueOf(practice)?.practice.steps[index]?.caption ?? null;
}

/** English name under the romanized one, when there is one. */
export function subtitleOf(practice: Practice): string | null {
  const technique = techniqueOf(practice);
  if (!technique) return practice.source.kind === 'custom' ? null : 'My rhythm';
  return practice.source.kind === 'technique' && practice.name === technique.name ? technique.subtitle : `Based on ${technique.name}`;
}

/** True when a library practice runs its default rhythm and target. */
export function isLibraryDefault(practice: Practice): boolean {
  const technique = techniqueOf(practice);
  if (!technique || practice.source.kind !== 'technique') return false;
  return (
    JSON.stringify(practice.target) === JSON.stringify(technique.practice.target) &&
    practice.steps.every((s, i) => s.seconds === technique.practice.steps[i].seconds)
  );
}

/** Stable key for quick actions and “most recent other practice”. */
export function practiceKey(subject: { source: PracticeSource | { kind: 'routine'; id: string } }): string {
  return subject.source.kind === 'custom' ? 'custom' : `${subject.source.kind}:${subject.source.id}`;
}

/**
 * Validates a practice read from storage or route params with the share-link
 * rules. Routine and program parts may use any whole number of minutes.
 */
export function parsePractice(value: unknown, options: { anyMinutes?: boolean } = {}): Practice | null {
  if (typeof value !== 'object' || value === null) return null;
  const v = value as Partial<Practice>;
  const source = v.source;
  const validSource =
    source !== null &&
    typeof source === 'object' &&
    (source.kind === 'custom' ||
      ((source.kind === 'technique' || source.kind === 'rhythm') && typeof source.id === 'string'));
  if (!validSource || !Array.isArray(v.steps) || typeof v.target !== 'object' || v.target === null) return null;
  const techniqueId = typeof v.techniqueId === 'string' ? v.techniqueId : null;
  if (source.kind === 'technique' && source.id !== techniqueId) return null;
  const rhythm = validateRhythm({ name: String(v.name ?? ''), steps: v.steps, target: v.target, techniqueId }, options);
  if (!rhythm) return null;
  const practice: Practice = { source, name: rhythm.name, techniqueId: rhythm.techniqueId, steps: rhythm.steps, target: rhythm.target };
  const slowing = checkSlowing(practice.techniqueId, practice.steps, v.slowing);
  if (slowing === false) return null;
  return slowing ? { ...practice, slowing } : practice;
}

/** Gradual slowing is offered for coherent breathing and custom rhythms (FR-24). */
export function canSlow(practice: Pick<Practice, 'techniqueId'>): boolean {
  return SLOWING_TECHNIQUES.includes(practice.techniqueId);
}
