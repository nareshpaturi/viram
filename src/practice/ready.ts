import type { Preferences } from '../settings/preferences';
import type { Stores } from '../storage/stores';
import { defaultPractice, type Practice } from './practice';

/**
 * The practice Breathe offers: the last one, unless it was a saved rhythm
 * that has since been deleted (FR-12), in which case the default.
 */
export function readyPractice(preferences: Preferences, stores: Stores): Practice {
  const last = preferences.lastPractice;
  if (!last) return defaultPractice();
  if (last.source.kind === 'rhythm' && !stores.rhythms.get(last.source.id)) return defaultPractice();
  return last;
}
