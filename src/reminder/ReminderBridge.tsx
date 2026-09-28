import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { router, usePathname } from 'expo-router';
import { readyLine } from '../practice/ready';
import type { Preferences } from '../settings/preferences';
import { usePreferences } from '../settings/PreferencesProvider';
import { stores } from '../storage';
import { isReminderResponse, syncReminder } from './reminder';

/** Reschedules with the current ready line; call after a session changes what's next. */
export function refreshReminder(preferences: Preferences): void {
  syncReminder(preferences.reminder, readyLine(preferences, stores())).catch(() => undefined);
}

/**
 * Keeps the daily reminder scheduled with the current ready practice, and
 * opens Breathe when it's tapped. A practice in progress is left alone.
 */
export function ReminderBridge() {
  const { preferences } = usePreferences();
  const pathname = usePathname();
  const path = useRef(pathname);
  path.current = pathname;
  const key = JSON.stringify([preferences.reminder, readyLine(preferences, stores())]);

  useEffect(() => {
    refreshReminder(preferences);
    // Reschedule only when the time, the switch, or the reminder text changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      if (isReminderResponse(response) && !path.current.startsWith('/practice')) router.navigate('/');
    });
    return () => subscription.remove();
  }, []);

  return null;
}
