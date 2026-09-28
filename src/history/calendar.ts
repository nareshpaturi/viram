/**
 * Practice calendar (FR-16): a month of practiced days and minutes, with no
 * streaks, chains, or missed days. Days come from the device's current
 * time zone, so the same records always land on the same days for a given
 * zone; travelling moves a late-night session to the local day it was.
 */
import type { SessionRecord } from './repository';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export interface Month {
  year: number;
  /** 0–11, as in Date. */
  month: number;
}

export interface CalendarDay {
  date: number;
  minutes: number;
  practiced: boolean;
}

export interface MonthSummary extends Month {
  title: string;
  /** Blank cells before the 1st in a Monday-first week. */
  leadingBlanks: number;
  days: CalendarDay[];
  daysPracticed: number;
  minutes: number;
  /** Minutes by practice name, most first; routine parts count under their own practice. */
  byPractice: { name: string; minutes: number }[];
  /** One sentence for screen readers. */
  spoken: string;
}

export const monthTitle = ({ year, month }: Month) => `${MONTHS[month]} ${year}`;

/** Local midnight at the start of the month, and of the next one. */
export function monthRange({ year, month }: Month): [number, number] {
  return [new Date(year, month, 1).getTime(), new Date(year, month + 1, 1).getTime()];
}

export const shiftMonth = ({ year, month }: Month, by: number): Month => {
  const d = new Date(year, month + by, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
};

export const monthOf = (epochMs: number): Month => {
  const d = new Date(epochMs);
  return { year: d.getFullYear(), month: d.getMonth() };
};

/** Whole minutes, never showing 0 for a practice that happened. */
const toMinutes = (ms: number) => (ms > 0 ? Math.max(1, Math.round(ms / 60_000)) : 0);

export function monthSummary(records: readonly SessionRecord[], at: Month): MonthSummary {
  const [start, end] = monthRange(at);
  const daysInMonth = new Date(at.year, at.month + 1, 0).getDate();
  const dayMs = new Array<number>(daysInMonth).fill(0);
  const practiced = new Array<boolean>(daysInMonth).fill(false);
  const byName = new Map<string, number>();
  let totalMs = 0;

  for (const record of records) {
    if (record.startedAt < start || record.startedAt >= end) continue;
    const day = new Date(record.startedAt).getDate() - 1;
    practiced[day] = true;
    dayMs[day] += record.activeMs;
    totalMs += record.activeMs;
    const parts = record.parts?.length ? record.parts : [{ name: record.name, activeMs: record.activeMs }];
    for (const part of parts) byName.set(part.name, (byName.get(part.name) ?? 0) + part.activeMs);
  }

  const daysPracticed = practiced.filter(Boolean).length;
  const minutes = toMinutes(totalMs);
  const title = monthTitle(at);
  return {
    ...at,
    title,
    leadingBlanks: (new Date(at.year, at.month, 1).getDay() + 6) % 7,
    days: dayMs.map((ms, i) => ({ date: i + 1, minutes: toMinutes(ms), practiced: practiced[i] })),
    daysPracticed,
    minutes,
    byPractice: [...byName.entries()]
      .map(([name, ms]) => ({ name, minutes: toMinutes(ms) }))
      .sort((a, b) => b.minutes - a.minutes || a.name.localeCompare(b.name)),
    spoken:
      daysPracticed === 0
        ? `${title}: no practice yet.`
        : `${title}: ${daysPracticed} ${daysPracticed === 1 ? 'day' : 'days'} practiced, ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}.`,
  };
}
