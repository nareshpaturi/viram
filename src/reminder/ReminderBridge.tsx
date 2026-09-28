import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { router, usePathname } from 'expo-router';
import { readyPractice } from '../practice/ready';
import { usePreferences } from '../settings/PreferencesProvider';
import { stores } from '../storage';
import { isReminderResponse, reminderBody, syncReminder } from './reminder';

/**
 * Keeps the daily reminder scheduled with the current ready practice, and
 * opens Breathe when it's tapped. A practice in progress is left alone.
 */
export function ReminderBridge() {
  const { preferences } = usePreferences();
  const pathname = usePathname();
  const path = useRef(pathname);
  path.current = pathname;
  const practice = readyPractice(preferences, stores());
  const key = JSON.stringify([preferences.reminder, reminderBody(practice)]);

  useEffect(() => {
    syncReminder(preferences.reminder, practice).catch(() => undefined);
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
