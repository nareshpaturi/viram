import type { Preferences } from '../settings/preferences';
import type { Stores } from '../storage/stores';
import { describeTarget } from '../breathing/describe';
import { nextSessionNumber, sessionLine } from '../programs/engine';
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

/**
 * What Breathe will offer, in one line for the daily reminder: the next
 * program session while one is active (FR-20), otherwise the ready practice.
 */
export function readyLine(preferences: Preferences, stores: Stores): string {
  const enrollment = stores.programs.active();
  const session = enrollment?.definition.sessions[nextSessionNumber(enrollment) - 1];
  if (session) return sessionLine(session);
  const practice = readyPractice(preferences, stores);
  return `${practice.name} · ${describeTarget(practice.target)}`;
}
