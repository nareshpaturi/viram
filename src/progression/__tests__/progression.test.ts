import { isValidSeconds } from '../../breathing/rhythm';
import { LIBRARY } from '../../content/library';
import type { SessionRecord } from '../../history/repository';
import { practiceFromTechnique, type Practice } from '../../practice/practice';
import { easierPractice, OFFER_WINDOW_MS, progressionOffer } from '../progression';

const DAY = 24 * 60 * 60 * 1000;
const NOW = 100 * DAY;
const none = { progressionStopped: [], progressionSnoozed: {} };

const technique = (id: string) => practiceFromTechnique(LIBRARY.find((t) => t.id === id)!);
const withSeconds = (p: Practice, seconds: number[]): Practice => ({ ...p, steps: p.steps.map((s, i) => ({ ...s, seconds: seconds[i] })) });

let n = 0;
const record = (practice: Practice, startedAt: number, change: Partial<SessionRecord> = {}): SessionRecord => ({
  id: String(n++),
  startedAt,
  activeMs: 300_000,
  source: practice.source,
  techniqueId: practice.techniqueId,
  name: practice.name,
  steps: practice.steps,
  target: practice.target,
  completedRounds: 30,
  breathsPerMinute: 6,
  outcome: 'completed',
  cueMode: 'voice',
  haptics: true,
  parts: null,
  program: null,
  health: 'none',
  ...change,
});

/** `count` completed sessions a day apart, the last one at NOW. */
const sessions = (practice: Practice, count: number) => Array.from({ length: count }, (_, i) => record(practice, NOW - (count - 1 - i) * DAY));

describe('progression offer', () => {
  const visama = technique('visama-vritti');

  it('offers the next step after the fifth completed session, not the fourth', () => {
    const four = sessions(visama, 4);
    expect(progressionOffer(four[3], four, none, NOW)).toBeNull();
    const five = sessions(visama, 5);
    const offer = progressionOffer(five[4], five, none, NOW)!;
    expect(offer.count).toBe(5);
    expect(offer.next.steps.map((s) => s.seconds)).toEqual([4, 0, 7, 0]);
    expect(offer.next.target).toEqual({ minutes: 5 });
    expect(offer.prompt).toBe('Try a slightly longer exhale next time?');
  });

  it('counts only the last 14 days', () => {
    const history = sessions(visama, 5);
    history[0] = { ...history[0], startedAt: NOW - OFFER_WINDOW_MS - 1 };
    expect(progressionOffer(history[4], history, none, NOW)).toBeNull();
    history[0] = { ...history[0], startedAt: NOW - OFFER_WINDOW_MS };
    expect(progressionOffer(history[4], history, none, NOW)).not.toBeNull();
  });

  it('never counts ended-early sessions, and never offers after one', () => {
    const history = sessions(visama, 5);
    history[1] = { ...history[1], outcome: 'ended' };
    expect(progressionOffer(history[4], history, none, NOW)).toBeNull();
    const six = [...sessions(visama, 5), record(visama, NOW, { outcome: 'ended' })];
    expect(progressionOffer(six[5], six, none, NOW)).toBeNull();
  });

  it('does not count sessions at a different rhythm or of another technique', () => {
    const history = sessions(visama, 5);
    history[0] = record(withSeconds(visama, [4, 0, 7, 0]), history[0].startedAt);
    expect(progressionOffer(history[4], history, none, NOW)).toBeNull();
    history[0] = record(technique('nadi-shodhana'), history[0].startedAt);
    expect(progressionOffer(history[4], history, none, NOW)).toBeNull();
  });

  it('counts a saved rhythm at the same technique and rhythm, and suggests the library step', () => {
    const saved: Practice = { ...visama, source: { kind: 'rhythm', id: 'r1' }, name: 'Evening exhale' };
    const history = sessions(saved, 5);
    const offer = progressionOffer(history[4], history, none, NOW)!;
    expect(offer.next.source).toEqual({ kind: 'technique', id: 'visama-vritti' });
    expect(offer.next.name).toBe('Visama Vritti');
  });

  it('walks the path one step at a time and stops at its end', () => {
    const seven = withSeconds(visama, [4, 0, 7, 0]);
    const at7 = sessions(seven, 5);
    expect(progressionOffer(at7[4], at7, none, NOW)!.next.steps.map((s) => s.seconds)).toEqual([4, 0, 8, 0]);
    const eight = withSeconds(visama, [4, 0, 8, 0]);
    const at8 = sessions(eight, 5);
    expect(progressionOffer(at8[4], at8, none, NOW)).toBeNull();
  });

  it('offers nothing off the path, for techniques without one, in routines, or in programs', () => {
    const off = sessions(withSeconds(visama, [5, 0, 7, 0]), 5);
    expect(progressionOffer(off[4], off, none, NOW)).toBeNull();
    const bhramari = sessions(technique('bhramari'), 5);
    expect(progressionOffer(bhramari[4], bhramari, none, NOW)).toBeNull();
    const program = sessions(visama, 5).map((r) => ({ ...r, program: { id: 'foundations', name: 'Pranayama Foundations', session: 2 } }));
    expect(progressionOffer(program[4], program, none, NOW)).toBeNull();
    const routine = sessions(visama, 5);
    routine[4] = { ...routine[4], source: { kind: 'routine', id: 'x' }, parts: [] };
    expect(progressionOffer(routine[4], routine, none, NOW)).toBeNull();
  });

  it('respects Stop suggesting, and after Not now waits for 5 more sessions', () => {
    const history = sessions(visama, 5);
    expect(progressionOffer(history[4], history, { ...none, progressionStopped: ['visama-vritti'] }, NOW)).toBeNull();
    const snoozed = { ...none, progressionSnoozed: { 'visama-vritti': NOW } };
    const later = [...history, ...Array.from({ length: 4 }, (_, i) => record(visama, NOW + (i + 1) * 1000))];
    expect(progressionOffer(later[8], later, snoozed, NOW + 4000)).toBeNull();
    const fifth = [...later, record(visama, NOW + 5000)];
    expect(progressionOffer(fifth[9], fifth, snoozed, NOW + 5000)!.count).toBe(5);
  });

  it('keeps every path step within bounds, with holds of 20 s or less', () => {
    for (const t of LIBRARY) {
      for (const seconds of t.practice.progression?.steps ?? []) {
        seconds.forEach((value, i) => expect(isValidSeconds(t.practice.steps[i].kind, value, t.practice.increment)).toBe(true));
        t.practice.steps.forEach((s, i) => {
          if (s.kind === 'hold' || s.kind === 'rest') expect(seconds[i]).toBeLessThanOrEqual(20);
        });
      }
    }
    expect(LIBRARY.filter((t) => t.practice.progression).map((t) => t.id).sort()).toEqual(['nadi-shodhana', 'sama-vritti', 'ujjayi', 'visama-vritti']);
  });
});

describe('make it easier', () => {
  it('steps back on the path when past the default', () => {
    const r = record(withSeconds(technique('sama-vritti'), [6, 6, 6, 6]), NOW);
    expect(easierPractice(r)!.steps.map((s) => s.seconds)).toEqual([5, 5, 5, 5]);
  });

  it('otherwise shortens the session', () => {
    expect(easierPractice(record(technique('visama-vritti'), NOW))!.target).toEqual({ minutes: 3 });
    expect(easierPractice(record({ ...technique('bhramari'), target: { minutes: 10 } }, NOW))!.target).toEqual({ minutes: 5 });
    expect(easierPractice(record(technique('4-7-8'), NOW))!.target).toEqual({ rounds: 3 });
    expect(easierPractice(record({ ...technique('4-7-8'), target: { rounds: 1 } }, NOW))).toBeNull();
    expect(easierPractice(record({ ...technique('sama-vritti'), target: { minutes: 1 } }, NOW))).toBeNull();
  });

  it('is offered for ended-early practices but not routines', () => {
    expect(easierPractice(record(technique('ujjayi'), NOW, { outcome: 'ended' }))).not.toBeNull();
    expect(easierPractice(record(technique('ujjayi'), NOW, { source: { kind: 'routine', id: 'x' }, parts: [] }))).toBeNull();
  });
});
