import type { SessionRecord } from '../../history/repository';
import { DEFAULT_PREFERENCES } from '../../settings/preferences';
import { offerTime, REMINDER_OFFER_AFTER, shouldOfferReminder } from '../offer';

const at = (hour: number, minute: number) => new Date(2026, 9, 7, hour, minute).getTime();
const record = (overrides: Partial<SessionRecord> = {}): SessionRecord => ({
  id: 'a',
  startedAt: at(7, 32),
  activeMs: 300_000,
  source: { kind: 'technique', id: 'sama-vritti' },
  techniqueId: 'sama-vritti',
  name: 'Sama Vritti',
  steps: [
    { kind: 'inhale', seconds: 4 },
    { kind: 'exhale', seconds: 4 },
  ],
  target: { minutes: 5 },
  completedRounds: 37,
  breathsPerMinute: 7.5,
  outcome: 'completed',
  cueMode: 'voice',
  haptics: true,
  parts: null,
  program: null,
  health: 'none',
  slowing: null,
  ...overrides,
});

describe('reminder offer', () => {
  it('suggests the time the practice began, to the nearest quarter hour', () => {
    expect(offerTime(at(7, 32))).toEqual({ hour: 7, minute: 30 });
    expect(offerTime(at(7, 38))).toEqual({ hour: 7, minute: 45 });
    expect(offerTime(at(21, 53))).toEqual({ hour: 22, minute: 0 });
    expect(offerTime(at(23, 55))).toEqual({ hour: 0, minute: 0 });
  });

  it('appears once there are enough saved practices', () => {
    expect(shouldOfferReminder(record(), REMINDER_OFFER_AFTER - 1, DEFAULT_PREFERENCES)).toBe(false);
    expect(shouldOfferReminder(record(), REMINDER_OFFER_AFTER, DEFAULT_PREFERENCES)).toBe(true);
  });

  it('never repeats, and never appears with the reminder on, after an early end, or in a program', () => {
    const many = REMINDER_OFFER_AFTER + 5;
    expect(shouldOfferReminder(record(), many, { ...DEFAULT_PREFERENCES, reminderOffered: true })).toBe(false);
    expect(shouldOfferReminder(record(), many, { ...DEFAULT_PREFERENCES, reminder: { enabled: true, hour: 7, minute: 30 } })).toBe(false);
    expect(shouldOfferReminder(record({ outcome: 'ended' }), many, DEFAULT_PREFERENCES)).toBe(false);
    expect(shouldOfferReminder(record({ program: { id: 'foundations', name: 'Foundations', session: 3 } }), many, DEFAULT_PREFERENCES)).toBe(false);
  });
});
