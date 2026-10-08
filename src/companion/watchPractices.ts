import { LIBRARY } from '../content/library';
import type { HealthState, SessionRecord } from '../history/repository';
import { healthEligible } from '../health/health';
import { practiceFromTechnique, quickBox, type Practice } from '../practice/practice';
import { readyPractice } from '../practice/ready';
import { practiceFromRhythm } from '../rhythms/describe';
import type { Preferences } from '../settings/preferences';
import type { Stores } from '../storage/stores';
import { companionContext, recordFromWatch, type CompanionContext } from './companion';

/**
 * What the watch offers, in order: Breathe's ready practice, 5-minute box
 * breathing, My rhythms (most recent first), then the library's defaults.
 */
export function watchContext(preferences: Preferences, stores: Pick<Stores, 'rhythms' | 'programs'>, now: number): CompanionContext {
  const practices: Practice[] = [
    readyPractice(preferences, stores as Stores),
    quickBox(),
    ...stores.rhythms.list().map(practiceFromRhythm),
    ...LIBRARY.map(practiceFromTechnique),
  ];
  return companionContext(practices, preferences, now);
}

/**
 * Saves sessions the watch sent and returns the ids to acknowledge: every
 * session read, kept or not, so an invalid one isn't offered again. Saving
 * is idempotent by id.
 */
export function saveWatchSessions(
  pending: readonly string[],
  stores: Pick<Stores, 'history'>,
  preferences: Pick<Preferences, 'healthConnected'>,
  now: number,
): { saved: SessionRecord[]; ids: string[] } {
  const saved: SessionRecord[] = [];
  const ids: string[] = [];
  for (const json of pending) {
    let value: unknown;
    try {
      value = JSON.parse(json);
    } catch {
      continue;
    }
    const id = typeof value === 'object' && value !== null ? (value as { id?: unknown }).id : undefined;
    if (typeof id === 'string') ids.push(id);
    const record = recordFromWatch(value, now);
    if (!record || stores.history.has(record.id)) continue;
    const health: HealthState = preferences.healthConnected && healthEligible(record) ? 'pending' : 'none';
    stores.history.save({ ...record, health });
    saved.push(record);
  }
  return { saved, ids };
}
