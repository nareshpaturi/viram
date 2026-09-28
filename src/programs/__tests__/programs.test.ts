import { planFor } from '../../breathing/rhythm';
import type { SessionRecord } from '../../history/repository';
import { findProgram, PROGRAMS } from '../definitions';
import {
  nextSessionNumber,
  phaseEndingAt,
  programTotals,
  recordSession,
  repeatPhase,
  repeatPrevious,
  sessionRun,
  sessionSubtitle,
  sessionTitle,
  start,
  welcomeBack,
  WELCOME_BACK_MS,
  type Enrollment,
} from '../engine';

const DAY = 24 * 60 * 60 * 1000;
const foundations = findProgram('foundations')!;
const path = findProgram('nadi-shodhana-path')!;

const record = (e: Enrollment, session: number, change: Partial<SessionRecord> = {}): SessionRecord => ({
  id: `r${session}`,
  startedAt: 0,
  activeMs: 300_000,
  source: { kind: 'technique', id: 'sama-vritti' },
  techniqueId: 'sama-vritti',
  name: 'Sama Vritti',
  steps: [],
  target: { minutes: 3 },
  completedRounds: 12,
  breathsPerMinute: 3.75,
  slowing: null,
  outcome: 'completed',
  cueMode: 'voice',
  haptics: true,
  parts: null,
  program: { id: e.programId, name: e.definition.name, session },
  health: 'none',
  ...change,
});

const complete = (e: Enrollment, sessions: number, at = 0) => {
  let next = e;
  for (let n = next.completedSessions + 1; n <= sessions; n++) next = recordSession(next, record(next, n), at + n * DAY);
  return next;
};

describe('program definitions', () => {
  it('builds every session from installed library techniques', () => {
    for (const program of PROGRAMS) {
      program.sessions.forEach((_, i) => expect(sessionRun(program, i + 1)).not.toBeNull());
    }
  });

  it('matches the PRD: Foundations in 7 sessions of about 39 minutes', () => {
    expect(foundations.sessions).toHaveLength(7);
    expect(foundations.sessions.map(sessionTitle)).toEqual([
      'Sama Vritti',
      'Visama Vritti',
      'Ujjayi',
      'Nadi Shodhana',
      'Bhramari',
      'Ujjayi → Nadi Shodhana',
      'Nadi Shodhana → Bhramari',
    ]);
    expect(sessionSubtitle(foundations.sessions[0])).toBe('Box breathing · 3 min');
    expect(sessionSubtitle(foundations.sessions[5])).toBe('Your first sequence · 8 min');
    expect(programTotals(foundations).minutes).toBe(39);
  });

  it('matches the PRD: Nadi Shodhana Path planned durations, with no retention', () => {
    expect(path.sessions).toHaveLength(21);
    const plan = (n: number) => {
      const part = sessionRun(path, n)!.parts[0];
      return planFor(part.steps, part.target);
    };
    expect(plan(1)).toMatchObject({ rounds: 15, durationMs: 300_000 });
    expect(plan(8)).toMatchObject({ rounds: 20, durationMs: 440_000 });
    expect(plan(15)).toMatchObject({ rounds: 25, durationMs: 600_000 });
    for (let n = 1; n <= 21; n++) expect(sessionRun(path, n)!.parts[0].steps.every((s) => s.kind === 'inhale' || s.kind === 'exhale')).toBe(true);
  });

  it('tags each run with its program and session', () => {
    expect(sessionRun(foundations, 6)).toMatchObject({ name: 'Ujjayi → Nadi Shodhana', program: { programId: 'foundations', session: 6, total: 7 } });
  });
});

describe('program progress', () => {
  it('advances only on the next session, completed', () => {
    const e = start(foundations, 'e', null, 0);
    expect(nextSessionNumber(e)).toBe(1);
    const one = recordSession(e, record(e, 1), DAY);
    expect(nextSessionNumber(one)).toBe(2);
    // Ended early doesn't count and stays next.
    expect(recordSession(one, record(one, 2, { outcome: 'ended' }), 2 * DAY)).toBe(one);
    // Saving the same session again, another program, or no program changes nothing.
    expect(recordSession(one, record(one, 1), 2 * DAY)).toBe(one);
    expect(recordSession(one, record(one, 2, { program: { id: 'nadi-shodhana-path', name: 'x', session: 2 } }), 2 * DAY)).toBe(one);
    expect(recordSession(one, record(one, 2, { program: null }), 2 * DAY)).toBe(one);
  });

  it('counts sessions, never days: several in a day, or weeks apart, count the same', () => {
    const e = start(foundations, 'e', null, 0);
    let sameDay = e;
    for (let n = 1; n <= 3; n++) sameDay = recordSession(sameDay, record(sameDay, n), 1000 * n);
    let spread = e;
    for (let n = 1; n <= 3; n++) spread = recordSession(spread, record(spread, n), 30 * DAY * n);
    expect(sameDay.completedSessions).toBe(3);
    expect(spread.completedSessions).toBe(3);
    // A clock set backwards doesn't undo progress.
    expect(recordSession(spread, record(spread, 4), -5 * DAY).completedSessions).toBe(4);
  });

  it('completes after the last session', () => {
    const done = complete(start(foundations, 'e', null, 0), 7);
    expect(done.state).toBe('completed');
    expect(recordSession(done, record(done, 7), 99 * DAY)).toBe(done);
  });

  it('offers welcome back after 7 days away, and not before', () => {
    const e = complete(start(foundations, 'e', null, 0), 3);
    const last = e.lastSessionAt!;
    expect(welcomeBack(e, last + WELCOME_BACK_MS - 1)).toBeNull();
    expect(welcomeBack(e, last + WELCOME_BACK_MS)).toEqual({ next: 4, repeat: 3 });
    expect(nextSessionNumber(repeatPrevious(e, last + WELCOME_BACK_MS))).toBe(3);
    expect(welcomeBack(start(foundations, 'e', null, 0), 30 * DAY)).toBeNull();
  });

  it('asks at a phase boundary, and Repeat this phase makes its first session next', () => {
    expect(phaseEndingAt(path, 6)).toBeNull();
    expect(phaseEndingAt(path, 7)).toMatchObject({ number: 1, next: { first: 8 } });
    expect(phaseEndingAt(path, 14)).toMatchObject({ number: 2, next: { first: 15 } });
    expect(phaseEndingAt(path, 21)).toBeNull();
    expect(phaseEndingAt(foundations, 7)).toBeNull();
    const seven = complete(start(path, 'e', null, 0), 7);
    expect(nextSessionNumber(seven)).toBe(8);
    expect(nextSessionNumber(repeatPhase(seven, phaseEndingAt(path, 7)!.done, 8 * DAY))).toBe(1);
  });

  it('keeps its snapshot when content changes', () => {
    const e = start(foundations, 'e', null, 0);
    const changed = { ...foundations, version: 2, sessions: foundations.sessions.slice(0, 3) };
    expect(e.definition.sessions).toHaveLength(7);
    expect(changed.sessions).toHaveLength(3);
    expect(e.contentVersion).toBe(1);
  });
});
