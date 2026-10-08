import type { SessionRecord } from '../repository';
import { allTime, hoursAndMinutes, monthRange, monthSummary, shiftMonth } from '../calendar';

let n = 0;
const record = (startedAt: Date, minutes: number, change: Partial<SessionRecord> = {}): SessionRecord => ({
  id: String(n++),
  startedAt: startedAt.getTime(),
  activeMs: minutes * 60_000,
  source: { kind: 'technique', id: 'sama-vritti' },
  techniqueId: 'sama-vritti',
  name: 'Sama Vritti',
  steps: [
    { kind: 'inhale', seconds: 4 },
    { kind: 'exhale', seconds: 4 },
  ],
  target: { minutes: 5 },
  completedRounds: 10,
  breathsPerMinute: 7.5,
  outcome: 'completed',
  cueMode: 'voice',
  haptics: true,
  parts: null,
  program: null,
  health: 'none',
  slowing: null,
  ...change,
});

const SEPT = { year: 2026, month: 8 };

describe('practice calendar', () => {
  it('marks practiced local days and totals days and minutes', () => {
    const records = [
      record(new Date(2026, 8, 3, 7, 30), 5),
      record(new Date(2026, 8, 3, 21, 0), 3),
      record(new Date(2026, 8, 20, 23, 59), 10, { outcome: 'ended' }),
    ];
    const summary = monthSummary(records, SEPT);
    expect(summary.days).toHaveLength(30);
    expect(summary.days.filter((d) => d.practiced).map((d) => d.date)).toEqual([3, 20]);
    expect(summary.days[2].minutes).toBe(8);
    expect(summary.daysPracticed).toBe(2);
    expect(summary.minutes).toBe(18);
    expect(summary.spoken).toBe('September 2026: 2 days practiced, 18 minutes.');
  });

  it('leaves out other months, including the first instant of the next', () => {
    const [, end] = monthRange(SEPT);
    const records = [record(new Date(2026, 7, 31, 23, 59), 5), record(new Date(end), 5), record(new Date(2026, 8, 1, 0, 0), 1)];
    const summary = monthSummary(records, SEPT);
    expect(summary.daysPracticed).toBe(1);
    expect(summary.days[0].practiced).toBe(true);
  });

  it('starts weeks on Monday', () => {
    // September 1, 2026 is a Tuesday; March 1, 2026 is a Sunday.
    expect(monthSummary([], SEPT).leadingBlanks).toBe(1);
    expect(monthSummary([], { year: 2026, month: 2 }).leadingBlanks).toBe(6);
  });

  it('counts minutes by practice, with routine parts under their own names', () => {
    const routine = record(new Date(2026, 8, 5, 8), 8, {
      source: { kind: 'routine', id: 'r' },
      name: 'Morning',
      parts: [
        { name: 'Sama Vritti', techniqueId: 'sama-vritti', steps: [], target: { minutes: 3 }, activeMs: 3 * 60_000, completedRounds: 12, breathsPerMinute: 3.75, outcome: 'completed' },
        { name: 'Bhramari', techniqueId: 'bhramari', steps: [], target: { minutes: 5 }, activeMs: 5 * 60_000, completedRounds: 25, breathsPerMinute: 5, outcome: 'completed' },
      ],
    });
    const summary = monthSummary([routine, record(new Date(2026, 8, 6), 5)], SEPT);
    expect(summary.byPractice).toEqual([
      { name: 'Sama Vritti', minutes: 8 },
      { name: 'Bhramari', minutes: 5 },
    ]);
  });

  it('never shows 0 minutes for a short practice, and says when a month is empty', () => {
    expect(monthSummary([record(new Date(2026, 8, 9), 0.2)], SEPT).days[8].minutes).toBe(1);
    expect(monthSummary([], SEPT).spoken).toBe('September 2026: no practice yet.');
  });

  it('moves between months across years', () => {
    expect(shiftMonth({ year: 2026, month: 0 }, -1)).toEqual({ year: 2025, month: 11 });
    expect(shiftMonth({ year: 2026, month: 11 }, 1)).toEqual({ year: 2027, month: 0 });
  });
});

describe('all-time totals', () => {
  it('counts practices, minutes, and local days, with no streaks', () => {
    const records = [
      record(new Date(2026, 8, 3, 7, 0), 5),
      record(new Date(2026, 8, 3, 21, 0), 10),
      record(new Date(2026, 8, 20, 7, 0), 50),
    ];
    const totals = allTime(records);
    expect(totals).toMatchObject({ practices: 3, minutes: 65, daysPracticed: 2 });
    expect(totals.line).toBe('3 practices · 1 h 5 min · 2 days');
    expect(totals.spoken).toBe('Since you began: 3 practices, 1 hour 5 minutes, on 2 days.');
  });

  it('reads naturally for one short practice and whole hours', () => {
    expect(allTime([record(new Date(2026, 8, 3, 7, 0), 3)]).line).toBe('1 practice · 3 min · 1 day');
    expect(hoursAndMinutes(120)).toBe('2 h');
    expect(hoursAndMinutes(0)).toBe('0 min');
  });
});
