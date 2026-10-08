/** Day grouping and times for History, in the device's local calendar. */
import type { SessionRecord } from './repository';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

export function dayLabel(epochMs: number, now = new Date()): string {
  const date = new Date(epochMs);
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (dayKey(date) === dayKey(now)) return 'Today';
  if (dayKey(date) === dayKey(yesterday)) return 'Yesterday';
  const base = `${WEEKDAYS[date.getDay()]}, ${MONTHS[date.getMonth()]} ${date.getDate()}`;
  return date.getFullYear() === now.getFullYear() ? base : `${base}, ${date.getFullYear()}`;
}

/** Completion's line: “5 minutes with your breath.”, or seconds under a minute (UX03). */
export function timeWithBreath(activeMs: number): string {
  const seconds = Math.round(activeMs / 1000);
  if (seconds < 60) return `${seconds} ${seconds === 1 ? 'second' : 'seconds'} with your breath.`;
  const minutes = Math.round(seconds / 60);
  return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} with your breath.`;
}

export function timeLabel(epochMs: number): string {
  const d = new Date(epochMs);
  const hour = d.getHours() % 12 || 12;
  return `${hour}:${String(d.getMinutes()).padStart(2, '0')} ${d.getHours() < 12 ? 'AM' : 'PM'}`;
}

/** Newest first, grouped by local day. */
export function groupByDay(records: readonly SessionRecord[], now = new Date()): { title: string; data: SessionRecord[] }[] {
  const groups = new Map<string, { title: string; data: SessionRecord[] }>();
  for (const record of records) {
    const key = dayKey(new Date(record.startedAt));
    if (!groups.has(key)) groups.set(key, { title: dayLabel(record.startedAt, now), data: [] });
    groups.get(key)!.data.push(record);
  }
  return [...groups.values()];
}
