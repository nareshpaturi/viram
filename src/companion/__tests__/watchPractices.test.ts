jest.mock('../../../modules/viram-health', () => ({ __esModule: true, default: null }));

import { LIBRARY } from '../../content/library';
import { practiceFromTechnique } from '../../practice/practice';
import { findProgram } from '../../programs/definitions';
import { start } from '../../programs/engine';
import { DEFAULT_PREFERENCES } from '../../settings/preferences';
import { migrate } from '../../storage/db';
import { createStores } from '../../storage/stores';
import { memoryDb } from '../../storage/__tests__/testDb';
import type { WatchSession } from '../companion';
import { MAX_WATCH_RHYTHMS, saveWatchSessions, watchContext } from '../watchPractices';

const NOW = Date.UTC(2026, 9, 7, 12);
const freshStores = () => {
  const db = memoryDb();
  migrate(db);
  return createStores(db);
};
const session = (id: string, change: Partial<WatchSession> = {}): string =>
  JSON.stringify({
    v: 1,
    id,
    startedAt: NOW - 600_000,
    activeMs: 300_000,
    completedRounds: 15,
    outcome: 'completed',
    practiceJson: JSON.stringify(practiceFromTechnique(LIBRARY.find((t) => t.id === 'nadi-shodhana')!)),
    ...change,
  });
const ID_A = '11111111-2222-3333-4444-555555555555';
const ID_B = '66666666-7777-8888-9999-000000000000';
const technique = (id: string) => practiceFromTechnique(LIBRARY.find((t) => t.id === id)!);
const saveRhythm = (stores: ReturnType<typeof freshStores>, name: string, exhale: number) =>
  stores.rhythms.save({ name, techniqueId: null, steps: [{ kind: 'inhale', seconds: 4 }, { kind: 'hold', seconds: 0 }, { kind: 'exhale', seconds: exhale }, { kind: 'rest', seconds: 0 }], target: { minutes: 10 }, origin: 'custom' });
/** Pranayama Foundations, begun now: session 1 is Sama Vritti for 3 minutes. */
const enroll = (stores: ReturnType<typeof freshStores>, completedSessions = 0) => {
  const program = findProgram('foundations')!;
  stores.programs.activate({ ...start(program, stores.programs.newId(), null, NOW), completedSessions }, NOW);
};

describe('watch practices', () => {
  it('offers Breathe’s practice first, then box breathing, My rhythms, and the library', () => {
    const stores = freshStores();
    const nadi = practiceFromTechnique(LIBRARY.find((t) => t.id === 'nadi-shodhana')!);
    const saved = saveRhythm(stores, 'Evening', 8);
    expect(saved.ok).toBe(true);
    const context = watchContext({ ...DEFAULT_PREFERENCES, lastPractice: nadi }, stores, NOW);
    expect(context.practices.slice(0, 3).map((p) => p.name)).toEqual(['Nadi Shodhana', 'Sama Vritti', 'Evening']);
    // Every practice in the library is there, once (QA W08).
    expect(context.practices.map((p) => p.name).slice(3)).toEqual(LIBRARY.filter((t) => !['nadi-shodhana', 'sama-vritti'].includes(t.id)).map((t) => t.name));
  });

  it('keeps 5-minute box breathing next to an adjusted Sama Vritti (QA W05)', () => {
    const adjusted = { ...technique('sama-vritti'), steps: technique('sama-vritti').steps.map((s) => ({ ...s, seconds: 6 })), target: { minutes: 20 } };
    const context = watchContext({ ...DEFAULT_PREFERENCES, lastPractice: adjusted }, freshStores(), NOW);
    expect(context.practices.slice(0, 2).map((p) => `${p.name} ${p.detail}`)).toEqual(['Sama Vritti 6 · 6 · 6 · 6 · 20 min', 'Sama Vritti 4 · 4 · 4 · 4 · 5 min']);
  });

  it('sends the most recent of My rhythms, and still the whole library (QA W08)', () => {
    const stores = freshStores();
    for (let i = 0; i < 20; i++) expect(saveRhythm(stores, `Rhythm ${i + 1}`, 4 + i * 0.5).ok).toBe(true);
    const names = watchContext(DEFAULT_PREFERENCES, stores, NOW).practices.map((p) => p.name);
    expect(names.filter((n) => n.startsWith('Rhythm '))).toHaveLength(MAX_WATCH_RHYTHMS);
    for (const t of LIBRARY) expect(names).toContain(t.name);
  });

  it('offers an active program’s next session first, as Breathe does (QA W06)', () => {
    const stores = freshStores();
    enroll(stores);
    const [first, second] = watchContext(DEFAULT_PREFERENCES, stores, NOW).practices;
    expect(`${first.name} ${first.detail}`).toBe('Sama Vritti Session 1 · 4 · 4 · 4 · 4 · 3 min');
    expect(JSON.parse(first.practiceJson).program).toEqual({ id: 'foundations', name: 'Pranayama Foundations', session: 1 });
    // The ready practice still follows, though it's the same rhythm for longer.
    expect(`${second.name} ${second.detail}`).toBe('Sama Vritti 4 · 4 · 4 · 4 · 5 min');
  });

  it('leaves a sequence session on the phone', () => {
    const stores = freshStores();
    enroll(stores, 5);
    expect(watchContext(DEFAULT_PREFERENCES, stores, NOW).practices.some((p) => p.detail.startsWith('Session'))).toBe(false);
  });

  it('counts a program session done on the watch toward its program', () => {
    const stores = freshStores();
    enroll(stores);
    const offered = watchContext(DEFAULT_PREFERENCES, stores, NOW).practices[0];
    const done = session(ID_A, { completedRounds: offered.rounds, activeMs: offered.durationMs, practiceJson: offered.practiceJson });
    expect(saveWatchSessions([done], stores, DEFAULT_PREFERENCES, NOW).saved).toHaveLength(1);
    expect(stores.history.get(ID_A)?.program).toEqual({ id: 'foundations', name: 'Pranayama Foundations', session: 1 });
    expect(stores.programs.active()?.completedSessions).toBe(1);
    // Next time, the watch offers session 2.
    expect(watchContext(DEFAULT_PREFERENCES, stores, NOW).practices[0].detail).toMatch(/^Session 2 · /);
  });

  it('keeps a session whose program tag doesn’t match the program, without counting it', () => {
    const stores = freshStores();
    enroll(stores);
    // Claims session 1, but runs 5 minutes of Nadi Shodhana.
    const json = JSON.stringify({ ...technique('nadi-shodhana'), program: { id: 'foundations', name: 'Pranayama Foundations', session: 1 } });
    saveWatchSessions([session(ID_A, { practiceJson: json })], stores, DEFAULT_PREFERENCES, NOW);
    expect(stores.history.get(ID_A)?.program).toBeNull();
    expect(stores.programs.active()?.completedSessions).toBe(0);
  });

  it('saves each valid session once and acknowledges everything it read', () => {
    const stores = freshStores();
    const pending = [session(ID_A), session(ID_A), session(ID_B, { activeMs: 0 }), '{not json'];
    const first = saveWatchSessions(pending, stores, DEFAULT_PREFERENCES, NOW);
    expect(first.saved.map((r) => r.id)).toEqual([ID_A]);
    expect(first.ids).toEqual([ID_A, ID_A, ID_B]);
    expect(stores.history.count()).toBe(1);
    expect(stores.history.get(ID_A)).toMatchObject({ cueMode: 'silent', haptics: true, health: 'none', name: 'Nadi Shodhana' });
    // Delivered again later: still one record.
    expect(saveWatchSessions([session(ID_A)], stores, DEFAULT_PREFERENCES, NOW).saved).toEqual([]);
    expect(stores.history.count()).toBe(1);
  });

  it('queues eligible sessions for Health when it is connected', () => {
    const stores = freshStores();
    saveWatchSessions([session(ID_A), session(ID_B, { activeMs: 45_000, outcome: 'ended', completedRounds: 2 })], stores, { healthConnected: true }, NOW);
    expect(stores.history.get(ID_A)?.health).toBe('pending');
    // Too short for Health, as on the phone.
    expect(stores.history.get(ID_B)?.health).toBe('none');
  });
});
