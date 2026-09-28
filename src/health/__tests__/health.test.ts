const mockWriteSession = jest.fn();
jest.mock('../../../modules/viram-health', () => ({
  __esModule: true,
  default: { availability: () => 'available', authorization: () => 'authorized', requestAuthorization: async () => 'authorized', writeSession: (...args: unknown[]) => mockWriteSession(...args) },
}));

import type { SessionRecord } from '../../history/repository';
import { migrate } from '../../storage/db';
import { createStores } from '../../storage/stores';
import { memoryDb } from '../../storage/__tests__/testDb';
import { flushHealth, healthEligible, writeToHealth } from '../health';

const record = (id: string, change: Partial<SessionRecord> = {}): SessionRecord => ({
  id,
  startedAt: 1_000_000,
  activeMs: 300_000,
  source: { kind: 'technique', id: 'sama-vritti' },
  techniqueId: 'sama-vritti',
  name: 'Sama Vritti',
  steps: [
    { kind: 'inhale', seconds: 4 },
    { kind: 'exhale', seconds: 4 },
  ],
  target: { minutes: 5 },
  completedRounds: 19,
  breathsPerMinute: 7.5,
  slowing: null,
  outcome: 'completed',
  cueMode: 'voice',
  haptics: true,
  parts: null,
  program: null,
  health: 'none',
  ...change,
});

const fresh = () => {
  const db = memoryDb();
  migrate(db);
  return createStores(db);
};

beforeEach(() => mockWriteSession.mockReset());

describe('health session writing', () => {
  it('only completed practices of at least 60 seconds qualify', () => {
    expect(healthEligible(record('a', { activeMs: 60_000 }))).toBe(true);
    expect(healthEligible(record('a', { activeMs: 59_999 }))).toBe(false);
    expect(healthEligible(record('a', { outcome: 'ended' }))).toBe(false);
  });

  it('writes the practice span once, and records a confirmed write', async () => {
    const stores = fresh();
    const r = record('a');
    stores.history.save(r);
    mockWriteSession.mockResolvedValue('written');
    expect(await writeToHealth(stores, r)).toBe('written');
    expect(mockWriteSession).toHaveBeenCalledWith('a', 1_000_000, 1_300_000);
    expect(stores.history.get('a')?.health).toBe('written');
    // A second attempt, even from a stale copy, never writes again.
    expect(await writeToHealth(stores, r)).toBe('written');
    expect(mockWriteSession).toHaveBeenCalledTimes(1);
  });

  it('never writes ineligible practices', async () => {
    const stores = fresh();
    const short = record('s', { activeMs: 30_000 });
    const ended = record('e', { outcome: 'ended' });
    stores.history.save(short);
    stores.history.save(ended);
    await writeToHealth(stores, short);
    await writeToHealth(stores, ended);
    expect(mockWriteSession).not.toHaveBeenCalled();
    expect(stores.history.get('s')?.health).toBe('none');
  });

  it('keeps failures and anything thrown as failed, never written', async () => {
    const stores = fresh();
    stores.history.save(record('f'));
    stores.history.save(record('t'));
    mockWriteSession.mockResolvedValueOnce('failed').mockRejectedValueOnce(new Error('boom'));
    expect(await writeToHealth(stores, record('f'))).toBe('failed');
    expect(await writeToHealth(stores, record('t'))).toBe('failed');
    expect(stores.history.withHealth('failed').map((r) => r.id).sort()).toEqual(['f', 't']);
  });

  it('retries pending sessions at launch, and failed ones only when asked', async () => {
    const stores = fresh();
    stores.history.save(record('p', { health: 'pending' }));
    stores.history.save(record('f', { health: 'failed', startedAt: 2_000_000 }));
    mockWriteSession.mockResolvedValue('written');
    expect(await flushHealth(stores)).toEqual({ written: 1, left: 0 });
    expect(stores.history.get('f')?.health).toBe('failed');
    expect(await flushHealth(stores, { includeFailed: true })).toEqual({ written: 1, left: 0 });
    expect(stores.history.withHealth('written')).toHaveLength(2);
  });

  it('leaves History alone when history is deleted, and Health records to the platform', () => {
    const stores = fresh();
    stores.history.save(record('w', { health: 'written' }));
    stores.preferences.write({ healthConnected: true });
    stores.history.deleteAll();
    expect(stores.history.count()).toBe(0);
    expect(stores.preferences.read().healthConnected).toBe(true);
  });
});
