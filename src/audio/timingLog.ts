/**
 * Developer cue-timing log (delivery plan D02, CP1b evidence).
 *
 * The native guide reports, for every voice or tone cue, how far from its
 * planned time it actually reached the output, measured from the audio
 * hardware's own timestamps. This module keeps the last practice's reports,
 * with markers for pauses and locking, and summarizes them against the
 * ±250 ms target. It is on in development builds, and in internal builds made
 * with EXPO_PUBLIC_TIMING_LOG=1; store builds never collect it.
 */

export const TIMING_LOG_ENABLED = __DEV__ || process.env.EXPO_PUBLIC_TIMING_LOG === '1';
export const TARGET_MS = 250;

export type TimingEntry =
  | { kind: 'cue'; segment: number; atMs: number; driftMs: number; sound: string; wallMs: number }
  | { kind: 'mark'; segment: number; label: string; wallMs: number };

export interface TimingLog {
  practice: string;
  details: string;
  startedAt: number;
  entries: TimingEntry[];
}

let current: TimingLog | null = null;
let segment = 0;

export function beginTimingLog(practice: string, details: string): void {
  if (!TIMING_LOG_ENABLED) return;
  current = { practice, details, startedAt: Date.now(), entries: [] };
  segment = 0;
}

/** Each guidance segment (the first, and each resume) restarts the cue clock. */
export function markSegment(label: string): void {
  segment += 1;
  markTiming(label);
}

export function markTiming(label: string): void {
  current?.entries.push({ kind: 'mark', segment, label, wallMs: Date.now() });
}

export function recordCue(report: { atMs: number; driftMs: number; sound: string }): void {
  current?.entries.push({ kind: 'cue', segment, ...report, wallMs: Date.now() });
}

export function currentTimingLog(): TimingLog | null {
  return current;
}

export interface TimingSummary {
  cues: number;
  meanAbsMs: number;
  p95AbsMs: number;
  maxAbsMs: number;
  /** Share of cues within ±250 ms, 0–1. */
  withinTarget: number;
  /** Drift of the completion cue: the “ends within ±250 ms of 5:04” check. */
  endDriftMs: number | null;
}

export function summarize(entries: readonly TimingEntry[]): TimingSummary | null {
  const cues = entries.filter((e): e is Extract<TimingEntry, { kind: 'cue' }> => e.kind === 'cue');
  if (cues.length === 0) return null;
  const abs = cues.map((c) => Math.abs(c.driftMs)).sort((a, b) => a - b);
  const end = [...cues].reverse().find((c) => c.sound.endsWith('.complete'));
  return {
    cues: cues.length,
    meanAbsMs: abs.reduce((sum, v) => sum + v, 0) / abs.length,
    p95AbsMs: abs[Math.min(abs.length - 1, Math.ceil(abs.length * 0.95) - 1)],
    maxAbsMs: abs[abs.length - 1],
    withinTarget: abs.filter((v) => v <= TARGET_MS).length / abs.length,
    endDriftMs: end ? end.driftMs : null,
  };
}

const csvField = (value: string | number) => (typeof value === 'number' ? value.toFixed(1) : `"${value.replace(/"/g, '""')}"`);

/** One row per cue or marker; wall time is seconds since the log began. */
export function timingCsv(log: TimingLog): string {
  const rows = [['segment', 'wall_s', 'kind', 'planned_ms', 'drift_ms', 'sound_or_label']];
  for (const e of log.entries) {
    const wall = ((e.wallMs - log.startedAt) / 1000).toFixed(2);
    rows.push(
      e.kind === 'cue'
        ? [String(e.segment), wall, 'cue', csvField(e.atMs), csvField(e.driftMs), csvField(e.sound)]
        : [String(e.segment), wall, 'mark', '', '', csvField(e.label)],
    );
  }
  return `# ${log.practice} · ${log.details} · started ${new Date(log.startedAt).toISOString()}\n${rows.map((r) => r.join(',')).join('\n')}\n`;
}
