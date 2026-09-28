/**
 * Daily reminder (FR-17): one local notification at the practitioner's
 * chosen time. Permission is asked only when they turn it on, and a
 * refusal is never asked again; the setting explains and stays off.
 * Tapping the reminder opens Breathe; it never starts a practice.
 */
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { Reminder } from '../settings/preferences';

export const REMINDER_TITLE = 'Time for a little space.';
const CHANNEL_ID = 'daily-reminder';

export type ReminderPermission = 'granted' | 'undetermined' | 'denied';

/** “7:30 AM” */
export function reminderTime({ hour, minute }: Pick<Reminder, 'hour' | 'minute'>): string {
  return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${hour < 12 ? 'AM' : 'PM'}`;
}

export async function reminderPermission(): Promise<ReminderPermission> {
  const settings = await Notifications.getPermissionsAsync();
  if (settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) return 'granted';
  return settings.canAskAgain ? 'undetermined' : 'denied';
}

/** Asks the system once, only after the practitioner turns the reminder on. */
export async function askForReminderPermission(): Promise<boolean> {
  const current = await reminderPermission();
  if (current !== 'undetermined') return current === 'granted';
  const result = await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true, allowBadge: false } });
  return result.granted;
}

/** Viram schedules nothing else, so replacing everything keeps exactly one. */
async function schedule(reminder: Reminder, body: string): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Daily reminder',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  await Notifications.scheduleNotificationAsync({
    content: { title: REMINDER_TITLE, body, data: { kind: 'reminder' }, sound: true },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: reminder.hour, minute: reminder.minute, channelId: CHANNEL_ID },
  });
}

/**
 * Brings the scheduled reminder in line with the setting and what Breathe
 * will offer (`body`, e.g. “Nadi Shodhana · 5 min”). Never prompts; returns
 * the permission it found so the setting can say when notifications were
 * turned off in system settings.
 */
export async function syncReminder(reminder: Reminder, body: string): Promise<ReminderPermission> {
  const permission = await reminderPermission();
  if (reminder.enabled && permission === 'granted') await schedule(reminder, body);
  else await Notifications.cancelAllScheduledNotificationsAsync();
  return permission;
}

export const isReminderResponse = (response: Notifications.NotificationResponse) =>
  response.notification.request.content.data?.kind === 'reminder';
