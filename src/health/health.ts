/**
 * Health session writing (FR-18). Local practice is complete on its own;
 * a qualifying completed practice (at least 60 s, never ended early) can
 * also be added to Apple Health or Health Connect, once, after the
 * practitioner chooses to. Viram writes mindful sessions and never reads.
 *
 * Each record's health_state is its place in a small queue:
 *   none → pending → written | failed | declined | unavailable
 * `failed` and `pending` are retried; `written` never is.
 */
import { Platform } from 'react-native';
import NativeHealth, { type HealthAuthorization } from '../../modules/viram-health';
import type { HealthState, SessionRecord } from '../history/repository';
import type { Stores } from '../storage/stores';

export const MIN_HEALTH_MS = 60_000;

export const HEALTH_NAME = Platform.OS === 'android' ? 'Health Connect' : 'Apple Health';

/** At least 60 s of practice and completed, never ended early. */
export const healthEligible = (record: Pick<SessionRecord, 'outcome' | 'activeMs'>) => record.outcome === 'completed' && record.activeMs >= MIN_HEALTH_MS;

/** Whether this device can write at all; the module is absent on web and in tests. */
export function healthAvailable(): boolean {
  try {
    return NativeHealth?.availability() === 'available';
  } catch {
    return false;
  }
}

export async function healthAuthorization(): Promise<HealthAuthorization> {
  if (!NativeHealth || !healthAvailable()) return 'unavailable';
  try {
    return await NativeHealth.authorization();
  } catch {
    return 'unavailable';
  }
}

/** Opens the real system permission UI. */
export async function requestHealthAuthorization(): Promise<HealthAuthorization> {
  if (!NativeHealth || !healthAvailable()) return 'unavailable';
  try {
    return await NativeHealth.requestAuthorization();
  } catch {
    return 'unavailable';
  }
}

/** A practice's span: it ended when it started plus its practice time. */
const spanOf = (record: SessionRecord) => ({ startMs: record.startedAt, endMs: record.startedAt + record.activeMs });

/**
 * Writes one record and stores the result. Never writes a record twice,
 * never writes an ineligible one, and says `written` only after the
 * platform confirms it.
 */
export async function writeToHealth(stores: Pick<Stores, 'history'>, record: SessionRecord): Promise<HealthState> {
  const current = stores.history.get(record.id)?.health ?? record.health;
  if (current === 'written' || !healthEligible(record)) return current;
  if (!NativeHealth) return current;
  stores.history.setHealth(record.id, 'pending');
  let result: HealthState;
  try {
    const { startMs, endMs } = spanOf(record);
    result = await NativeHealth.writeSession(record.id, startMs, endMs);
  } catch {
    result = 'failed';
  }
  stores.history.setHealth(record.id, result);
  return result;
}

/** Retries sessions still waiting, and, when asked, ones that failed. Oldest first. */
export async function flushHealth(stores: Pick<Stores, 'history'>, options: { includeFailed?: boolean } = {}): Promise<{ written: number; left: number }> {
  const queue = [...stores.history.withHealth('pending'), ...(options.includeFailed ? stores.history.withHealth('failed') : [])];
  let written = 0;
  for (const record of queue) {
    if ((await writeToHealth(stores, record)) === 'written') written++;
  }
  return { written, left: queue.length - written };
}

/** The result line shown for one practice (the five FR-18 states). */
export const HEALTH_RESULT: Record<Exclude<HealthState, 'none'>, { title: string; body: string }> = {
  written: { title: `Added to ${HEALTH_NAME}.`, body: `This completed practice is saved here and in ${HEALTH_NAME}.` },
  pending: { title: 'Waiting to add your session.', body: `Your practice is saved here. Viram will try again when ${HEALTH_NAME} is available.` },
  declined: { title: 'Saved here, as always.', body: `Your practice stays in local History. You can connect ${HEALTH_NAME} from Settings later.` },
  unavailable: { title: 'Health is unavailable.', body: 'Your practice is saved here. You can keep using Viram without this connection.' },
  failed: { title: 'Couldn’t add this session.', body: 'Your practice is safe in local History. You can retry from Settings.' },
};
