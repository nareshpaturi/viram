jest.mock('expo-notifications', () => ({}));

import { DEFAULT_PREFERENCES, parsePreferences } from '../../settings/preferences';
import { reminderTime } from '../reminder';

describe('daily reminder', () => {
  it('is off by default', () => {
    expect(DEFAULT_PREFERENCES.reminder.enabled).toBe(false);
  });

  it('formats times in the local 12-hour clock', () => {
    expect(reminderTime({ hour: 7, minute: 30 })).toBe('7:30 AM');
    expect(reminderTime({ hour: 0, minute: 5 })).toBe('12:05 AM');
    expect(reminderTime({ hour: 12, minute: 30 })).toBe('12:30 PM');
    expect(reminderTime({ hour: 21, minute: 0 })).toBe('9:00 PM');
  });

  it('keeps only a well-formed reminder from storage', () => {
    expect(parsePreferences({ reminder: { enabled: true, hour: 21, minute: 0 } }).reminder).toEqual({ enabled: true, hour: 21, minute: 0 });
    expect(parsePreferences({ reminder: { enabled: true, hour: 24, minute: 0 } }).reminder).toBeUndefined();
    expect(parsePreferences({ reminder: { enabled: 'yes', hour: 7, minute: 30 } }).reminder).toBeUndefined();
    expect(parsePreferences({ reminder: { enabled: false, hour: 7, minute: 7.5 } }).reminder).toBeUndefined();
  });
});
