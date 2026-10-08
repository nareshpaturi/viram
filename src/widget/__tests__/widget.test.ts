import { LIBRARY } from '../../content/library';
import type { SessionRecord } from '../../history/repository';
import { practiceFromTechnique } from '../../practice/practice';
import { findProgram } from '../../programs/definitions';
import { start } from '../../programs/engine';
import { DEFAULT_PREFERENCES } from '../../settings/preferences';
import { migrate } from '../../storage/db';
import { createStores } from '../../storage/stores';
import { memoryDb } from '../../storage/__tests__/testDb';
import { localDay, widgetData } from '../widget';

const freshStores = () => {
  const db = memoryDb();
  migrate(db);
  return createStores(db);
};
const nadi = practiceFromTechnique(LIBRARY.find((t) => t.id === 'nadi-shodhana')!);

describe('widget', () => {
  it('shows Breathe’s ready practice and opens its settle countdown without an introduction', () => {
    const data = widgetData({ ...DEFAULT_PREFERENCES, lastPractice: nadi }, freshStores());
    expect(data.name).toBe('Nadi Shodhana');
    expect(data.detail).toBe('in 4 · out 6, each side · 5 min');
    expect(data.url.startsWith('viram:///practice?run=')).toBe(true);
    expect(data.url.endsWith('&quick=1')).toBe(true);
    expect(JSON.parse(decodeURIComponent(data.url.split('run=')[1].split('&')[0])).parts[0].techniqueId).toBe('nadi-shodhana');
    expect(data.lastPracticeDay).toBeNull();
  });

  it('names the day of the last practice', () => {
    const stores = freshStores();
    const startedAt = new Date(2026, 9, 7, 7, 30).getTime();
    const record: SessionRecord = {
      id: 'a',
      startedAt,
      activeMs: 300_000,
      source: nadi.source,
      techniqueId: nadi.techniqueId,
      name: nadi.name,
      steps: nadi.steps,
      target: nadi.target,
      completedRounds: 15,
      breathsPerMinute: 6,
      slowing: null,
      outcome: 'completed',
      cueMode: 'voice',
      haptics: true,
      parts: null,
      program: null,
      health: 'none',
    };
    stores.history.save(record);
    expect(widgetData(DEFAULT_PREFERENCES, stores).lastPracticeDay).toBe('2026-10-07');
    expect(localDay(new Date(2026, 0, 5, 23, 59).getTime())).toBe('2026-01-05');
  });

  it('shows the next program session while one is active', () => {
    const stores = freshStores();
    stores.programs.save(start(findProgram('foundations')!, 'enrollment-1', null, Date.now()));
    const data = widgetData(DEFAULT_PREFERENCES, stores);
    expect(data.name).toBe('Pranayama Foundations');
    expect(data.detail.startsWith('Session 1 · ')).toBe(true);
  });
});
