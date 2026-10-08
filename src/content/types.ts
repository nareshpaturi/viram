/**
 * Technique content contract (PRD section 05). Library data lives in
 * library.ts; scripts/check-content.mjs enforces the rules types can't express.
 */
import type { Increment, RhythmStep, Target } from '../breathing/rhythm';
import type { SourceId } from './sources';

/** A rhythm step with its practice caption. Bounds live in src/breathing/rhythm.ts. */
export interface Step extends RhythmStep {
  /** One line under the step name during practice. */
  caption: string;
}

export type { Target };

export interface Review {
  reviewer: string;
  credential: string;
  /** ISO date the review was recorded. */
  date: string;
  /** Must equal the technique's contentVersion or the line is not shown. */
  contentVersion: number;
}

export interface Technique {
  /** Stable; share links and history refer to it. */
  id: string;
  contentVersion: number;
  /** v1.x ships gentle techniques only. */
  riskTier: 'gentle';
  shareable: boolean;
  family: 'classical' | 'modern';
  name: string;
  subtitle: string;
  /** Other names people search for, e.g. “Anulom Vilom” (v1.1). */
  aliases?: string[];
  /** Present for Sanskrit names. Common romanization only; the fonts lack IAST underdots. */
  pronunciation?: {
    devanagari: string;
    respelling: string;
    clip: string;
  };
  practice: {
    steps: Step[];
    increment: Increment;
    target: Target;
    posture: 'seated' | 'seated-or-lying';
    /**
     * Practices taught in rounds (UX07): the counts Breathe's Duration sheet
     * offers, each with a short note, e.g. 4 “as taught”.
     */
    roundOptions?: { rounds: number; note: string }[];
    /**
     * A practice taught as a set number of rounds (4-7-8): its target is
     * always rounds, never more than this, wherever it runs, from Adjust
     * rhythm to routines, saved rhythms, links, and imports.
     */
    maxRounds?: number;
    /**
     * v1.1 gentle progression (FR-15): the rhythms after the default, one
     * step at a time. Each lists every step's seconds in order. Offered,
     * never applied automatically.
     */
    progression?: {
      steps: number[][];
      /** The completion screen's question, e.g. “Try a slightly longer exhale next time?” */
      prompt: string;
    };
  };
  guidance: {
    /** The Duration sheet's footnote for a practice taught in rounds. */
    roundsNote?: string;
    /** Opening paragraph of the guide, below the rhythm card and Take care. */
    lead: string;
    /** Above the fold, before Begin. */
    takeCareShort: string;
    /** Done once before the first round, shown while settling (4-7-8's first exhale). */
    preparation?: string;
    howTo: string[];
    /** Headed “Traditionally” (classical) or “Where it comes from” (modern). */
    context: string;
    takeCare: string[];
    research: string;
    basedOn: SourceId[];
    /** Spoken before settling; each line is also a caption. */
    introduction: {
      clip: string;
      lines: string[];
      /**
       * The short introduction names no counts, lengths, or holds, so it still
       * fits after Adjust rhythm changes the steps. Without this, an adjusted
       * rhythm starts without an introduction rather than contradict it.
       */
      fitsAdjusted?: true;
      /** v1.1 fuller voice (FR-19): a longer version, chosen in Cues & sound. */
      long?: { clip: string; lines: string[]; fitsAdjusted?: true };
    };
  };
  /** “Reviewed by” renders only from this field. */
  review: Review | null;
}
