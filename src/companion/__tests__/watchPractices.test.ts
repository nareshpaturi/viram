jest.mock('../../../modules/viram-health', () => ({ __esModule: true, default: null }));

import { LIBRARY } from '../../content/library';
import { practiceFromTechnique } from '../../practice/practice';
import { DEFAULT_PREFERENCES } from '../../settings/preferences';
import { migrate } from '../../storage/db';
import { createStores } from '../../storage/stores';
import { memoryDb } from '../../storage/__tests__/testDb';
import type { WatchSession } from '../companion';
import { saveWatchSessions, watchContext } from '../watchPractices';

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

describe('watch practices', () => {
  it('offers Breathe’s practice first, then box breathing, My rhythms, and the library', () => {
    const stores = freshStores();
    const nadi = practiceFromTechnique(LIBRARY.find((t) => t.id === 'nadi-shodhana')!);
    const saved = stores.rhythms.save({ name: 'Evening', techniqueId: null, steps: [{ kind: 'inhale', seconds: 4 }, { kind: 'hold', seconds: 0 }, { kind: 'exhale', seconds: 8 }, { kind: 'rest', seconds: 0 }], target: { minutes: 10 }, origin: 'custom' });
    expect(saved.ok).toBe(true);
    const context = watchContext({ ...DEFAULT_PREFERENCES, lastPractice: nadi }, stores, NOW);
    expect(context.practices.slice(0, 3).map((p) => p.name)).toEqual(['Nadi Shodhana', 'Sama Vritti', 'Evening']);
    expect(context.practices).toHaveLength(8);
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
    saveWatchSessions([session(ID_A), session(ID_B, { activeMs: 30_000, outcome: 'ended', completedRounds: 2 })], stores, { healthConnected: true }, NOW);
    expect(stores.history.get(ID_A)?.health).toBe('pending');
    // Too short for Health, as on the phone.
    expect(stores.history.get(ID_B)?.health).toBe('none');
  });
});
