/**
 * The reminder, offered once (FR-17). Forgetting is the most common reason
 * people stop practicing, and a regular time helps a habit form, so after
 * a few practices the completion screen offers, once, to remind at about
 * the time this practice began. One answer, never asked again; Settings
 * keeps the reminder either way. Pure, so it is tested without a device.
 */
import type { SessionRecord } from '../history/repository';
import type { Preferences } from '../settings/preferences';

/** Saved practices, this one included, before the offer appears. */
export const REMINDER_OFFER_AFTER = 3;
const STEP_MINUTES = 15;
const DAY_MINUTES = 24 * 60;

/** The local time a practice began, to the nearest quarter hour. */
export function offerTime(startedAt: number): { hour: number; minute: number } {
  const date = new Date(startedAt);
  const minutes = (Math.round((date.getHours() * 60 + date.getMinutes()) / STEP_MINUTES) * STEP_MINUTES) % DAY_MINUTES;
  return { hour: Math.floor(minutes / 60), minute: minutes % 60 };
}

/**
 * Offered after a completed single practice or routine once there are
 * enough saved practices, while the reminder is off and the offer has never
 * been shown. Programs offer their own reminder when they start.
 */
export function shouldOfferReminder(record: SessionRecord, savedPractices: number, preferences: Pick<Preferences, 'reminder' | 'reminderOffered'>): boolean {
  return (
    record.outcome === 'completed' &&
    !record.program &&
    !preferences.reminder.enabled &&
    !preferences.reminderOffered &&
    savedPractices >= REMINDER_OFFER_AFTER
  );
}
