/**
 * Local practice records (FR-05). Only completed or intentionally ended
 * practices are stored, each with snapshots of its name and steps so later
 * renames, deletions, or content updates never rewrite history.
 */
import type { CueMode } from '../breathing/timeline';
import type { RhythmStep, Target } from '../breathing/rhythm';
import type { Db } from '../storage/db';
import type { PracticeSource } from '../practice/practice';

export interface SessionRecord {
  id: string;
  startedAt: number;
  activeMs: number;
  source: PracticeSource;
  techniqueId: string | null;
  name: string;
  steps: RhythmStep[];
  target: Target;
  completedRounds: number;
  breathsPerMinute: number;
  outcome: 'completed' | 'ended';
  cueMode: CueMode;
  haptics: boolean;
}

interface Row {
  id: string;
  started_at: number;
  active_ms: number;
  practice_kind: string;
  practice_ref: string | null;
  technique_id: string | null;
  name: string;
  steps: string;
  target_kind: string;
  target_value: number;
  completed_rounds: number;
  breaths_per_minute: number;
  outcome: string;
  cue_mode: string;
  haptics: number;
}

const COLUMNS =
  'id, started_at, active_ms, practice_kind, practice_ref, technique_id, name, steps, target_kind, target_value, completed_rounds, breaths_per_minute, outcome, cue_mode, haptics';

export function targetColumns(target: Target): [string, number] {
  return 'minutes' in target ? ['minutes', target.minutes] : ['rounds', target.rounds];
}

export function targetFrom(kind: string, value: number): Target {
  return kind === 'minutes' ? ({ minutes: value } as Target) : { rounds: value };
}

function sourceFrom(kind: string, ref: string | null): PracticeSource | null {
  if (kind === 'custom') return { kind: 'custom' };
  if ((kind === 'technique' || kind === 'rhythm') && ref) return { kind, id: ref };
  return null;
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * Records are snapshots, so they are checked for shape and bounds but not
 * against today's library: a record keeps its original steps even if a
 * technique changes.
 */
export function recordFromRow(row: Row): SessionRecord | null {
  const source = sourceFrom(row.practice_kind, row.practice_ref);
  const steps = parseJson(row.steps);
  const target = targetFrom(row.target_kind, row.target_value);
  const outcome = row.outcome === 'completed' || row.outcome === 'ended' ? row.outcome : null;
  const cueMode = ['voice', 'tones', 'silent'].includes(row.cue_mode) ? (row.cue_mode as CueMode) : null;
  if (!source || !outcome || !cueMode || !isSnapshot(steps) || !Number.isFinite(row.active_ms)) return null;
  return {
    id: row.id,
    startedAt: row.started_at,
    activeMs: row.active_ms,
    source,
    techniqueId: row.technique_id,
    name: row.name,
    steps,
    target,
    completedRounds: row.completed_rounds,
    breathsPerMinute: row.breaths_per_minute,
    outcome,
    cueMode,
    haptics: row.haptics === 1,
  };
}

function isSnapshot(steps: unknown): steps is RhythmStep[] {
  return (
    Array.isArray(steps) &&
    steps.length >= 2 &&
    steps.length <= 8 &&
    steps.every((s) => {
      if (typeof s !== 'object' || s === null) return false;
      const step = s as RhythmStep;
      return ['inhale', 'hold', 'exhale', 'rest'].includes(step.kind) && typeof step.seconds === 'number' && step.seconds >= 0 && step.seconds <= 20;
    })
  );
}

/** Validates a record from outside storage (route params, import files) exactly as storage would read it. */
export function parseRecord(value: unknown): SessionRecord | null {
  if (typeof value !== 'object' || value === null) return null;
  const s = value as SessionRecord;
  if (typeof s.id !== 'string' || !s.id || typeof s.name !== 'string' || !Number.isFinite(s.startedAt)) return null;
  if (!Number.isInteger(s.completedRounds) || s.completedRounds < 0 || !Number.isFinite(s.breathsPerMinute)) return null;
  if (typeof s.source !== 'object' || s.source === null || typeof s.target !== 'object' || s.target === null) return null;
  if (s.techniqueId !== null && typeof s.techniqueId !== 'string') return null;
  const [targetKind, targetValue] = targetColumns(s.target);
  return recordFromRow({
    id: s.id,
    started_at: s.startedAt,
    active_ms: s.activeMs,
    practice_kind: s.source.kind,
    practice_ref: s.source.kind === 'custom' ? null : s.source.id,
    technique_id: s.techniqueId,
    name: s.name,
    steps: JSON.stringify(s.steps),
    target_kind: targetKind,
    target_value: targetValue,
    completed_rounds: s.completedRounds,
    breaths_per_minute: s.breathsPerMinute,
    outcome: s.outcome,
    cue_mode: s.cueMode,
    haptics: s.haptics ? 1 : 0,
  });
}

export function historyRepository(db: Db) {
  return {
    /** Idempotent: saving the same record twice keeps one. */
    save(record: SessionRecord): void {
      const [targetKind, targetValue] = targetColumns(record.target);
      db.runSync(`INSERT OR IGNORE INTO sessions (${COLUMNS}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
        record.id,
        record.startedAt,
        Math.round(record.activeMs),
        record.source.kind,
        record.source.kind === 'custom' ? null : record.source.id,
        record.techniqueId,
        record.name,
        JSON.stringify(record.steps),
        targetKind,
        targetValue,
        record.completedRounds,
        record.breathsPerMinute,
        record.outcome,
        record.cueMode,
        record.haptics ? 1 : 0,
      ]);
    },

    /** Newest first. */
    list(limit = 1000): SessionRecord[] {
      return db
        .getAllSync<Row>(`SELECT ${COLUMNS} FROM sessions ORDER BY started_at DESC LIMIT ?`, [limit])
        .map(recordFromRow)
        .filter((r): r is SessionRecord => r !== null);
    },

    get(id: string): SessionRecord | null {
      const row = db.getFirstSync<Row>(`SELECT ${COLUMNS} FROM sessions WHERE id = ?`, [id]);
      return row ? recordFromRow(row) : null;
    },

    has(id: string): boolean {
      return db.getFirstSync<{ id: string }>('SELECT id FROM sessions WHERE id = ?', [id]) !== null;
    },

    count(): number {
      return db.getFirstSync<{ n: number }>('SELECT COUNT(*) AS n FROM sessions', [])?.n ?? 0;
    },

    /** Removes practice records only; preferences and My rhythms stay. */
    deleteAll(): void {
      db.runSync('DELETE FROM sessions', []);
    },
  };
}

export type HistoryRepository = ReturnType<typeof historyRepository>;
