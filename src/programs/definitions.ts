/**
 * Curated programs (FR-20): two bundled plans built only from library
 * techniques. Definitions are versioned; an enrollment keeps a snapshot, so
 * a content update never changes a program in progress. No breath
 * retention anywhere, and every rhythm stays inside the technique's bounds.
 */

export interface ProgramPart {
  techniqueId: string;
  minutes: number;
  /** Every step's seconds, when the session changes the library rhythm. */
  seconds?: number[];
}

export interface ProgramSession {
  parts: ProgramPart[];
  /** For joined sessions: “Your first sequence”. */
  label?: string;
  /** What this session brings, shown as the next session: “It introduces alternate nostril breathing.” */
  introduces?: string;
}

export interface ProgramPhase {
  /** 1-based, inclusive. */
  first: number;
  last: number;
  /** “Seven sessions of Nadi Shodhana at in 4 · out 6.” */
  summary: string;
  /** Shown before moving into this phase. */
  intro: string;
}

export interface Program {
  id: string;
  version: number;
  name: string;
  /** Short name for completion: “Foundations”. */
  shortName: string;
  eyebrow: string;
  description: string;
  /** One line under the name in Practices. */
  summary: string;
  sessions: ProgramSession[];
  phases: ProgramPhase[] | null;
  /** Suggested after completion. */
  next: string | null;
}

const nadi = (seconds: number[], minutes: number): ProgramPart => ({ techniqueId: 'nadi-shodhana', minutes, seconds });

export const PROGRAMS: readonly Program[] = [
  {
    id: 'foundations',
    version: 1,
    name: 'Pranayama Foundations',
    shortName: 'Foundations',
    eyebrow: 'Start here · 7 sessions',
    description: 'Learn five classical techniques one at a time, then join them. Each new technique plays its introduction first.',
    summary: 'Five classical techniques, one at a time, then joined.',
    sessions: [
      { parts: [{ techniqueId: 'sama-vritti', minutes: 3 }], introduces: 'It introduces box breathing.' },
      { parts: [{ techniqueId: 'visama-vritti', minutes: 5 }], introduces: 'It introduces a longer exhale.' },
      { parts: [{ techniqueId: 'ujjayi', minutes: 5 }], introduces: 'It introduces the soft sound of ocean breath.' },
      { parts: [{ techniqueId: 'nadi-shodhana', minutes: 5 }], introduces: 'It introduces alternate nostril breathing.' },
      { parts: [{ techniqueId: 'bhramari', minutes: 5 }], introduces: 'It introduces the humming bee breath.' },
      {
        parts: [
          { techniqueId: 'ujjayi', minutes: 3 },
          { techniqueId: 'nadi-shodhana', minutes: 5 },
        ],
        label: 'Your first sequence',
        introduces: 'It joins two practices for the first time.',
      },
      {
        parts: [
          { techniqueId: 'nadi-shodhana', minutes: 5 },
          { techniqueId: 'bhramari', minutes: 3 },
        ],
        label: 'Close with a hum',
        introduces: 'It closes with a hum.',
      },
    ],
    phases: null,
    next: 'nadi-shodhana-path',
  },
  {
    id: 'nadi-shodhana-path',
    version: 1,
    name: 'Nadi Shodhana Path',
    shortName: 'Nadi Shodhana Path',
    eyebrow: '21 sessions · 3 phases',
    description:
      'Alternate nostril breathing, three weeks at a time. Each phase lengthens the exhale by one second and the practice a little. There is no breath retention.',
    summary: 'Alternate nostril breathing, lengthening the exhale gently over three phases.',
    sessions: [
      ...Array.from({ length: 7 }, (): ProgramSession => ({ parts: [nadi([4, 6, 4, 6], 5)] })),
      ...Array.from({ length: 7 }, (): ProgramSession => ({ parts: [nadi([4, 7, 4, 7], 7)] })),
      ...Array.from({ length: 7 }, (): ProgramSession => ({ parts: [nadi([4, 8, 4, 8], 10)] })),
    ],
    phases: [
      { first: 1, last: 7, summary: 'Seven sessions of Nadi Shodhana at in 4 · out 6.', intro: 'Phase 1 settles into alternate nostril breathing at in 4 · out 6 for 5 minutes.' },
      { first: 8, last: 14, summary: 'Seven sessions of Nadi Shodhana at in 4 · out 7.', intro: 'Phase 2 lengthens each exhale by one second and the practice to 7 minutes.' },
      { first: 15, last: 21, summary: 'Seven sessions of Nadi Shodhana at in 4 · out 8.', intro: 'Phase 3 lengthens each exhale by one more second and the practice to 10 minutes.' },
    ],
    next: null,
  },
];

export const findProgram = (id: string): Program | undefined => PROGRAMS.find((p) => p.id === id);
