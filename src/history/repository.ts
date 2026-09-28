/**
 * Local practice records (FR-05). Only completed or intentionally ended
 * practices are stored, each with snapshots of its name and steps so later
 * renames, deletions, or content updates never rewrite history. A routine is
 * one record with a snapshot of every practice reached (FR-14); a program
 * session carries its program and session number (FR-20).
 */
import type { CueMode } from '../breathing/timeline';
import type { RhythmStep, Target } from '../breathing/rhythm';
import type { Db } from '../storage/db';
import type { PracticeSource } from '../practice/practice';

export type RecordSource = PracticeSource | { kind: 'routine'; id: string };

/**
 * Apple Health / Health Connect write state (FR-18). `none` means never
 * offered or not eligible; only a confirmed write becomes `written`.
 */
export type HealthState = 'none' | 'pending' | 'written' | 'unavailable' | 'declined' | 'failed';
export const HEALTH_STATES: readonly HealthState[] = ['none', 'pending', 'written', 'unavailable', 'declined', 'failed'];

export interface PartRecord {
  name: string;
  techniqueId: string | null;
  steps: RhythmStep[];
  target: Target;
  activeMs: number;
  completedRounds: number;
  breathsPerMinute: number;
  outcome: 'completed' | 'ended';
}

export interface ProgramTag {
  id: string;
  name: string;
  session: number;
}

export interface SessionRecord {
  id: string;
  startedAt: number;
  activeMs: number;
  source: RecordSource;
  techniqueId: string | null;
  name: string;
  /** The practice's steps, or a routine's first practice's. */
  steps: RhythmStep[];
  target: Target;
  completedRounds: number;
  breathsPerMinute: number;
  outcome: 'completed' | 'ended';
  cueMode: CueMode;
  haptics: boolean;
  /** Every practice reached, for routines; null for a single practice. */
  parts: PartRecord[] | null;
  program: ProgramTag | null;
  health: HealthState;
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
  parts: string | null;
  program: string | null;
  health_state: string;
}

const COLUMN_NAMES: (keyof Row)[] = [
  'id',
  'started_at',
  'active_ms',
  'practice_kind',
  'practice_ref',
  'technique_id',
  'name',
  'steps',
  'target_kind',
  'target_value',
  'completed_rounds',
  'breaths_per_minute',
  'outcome',
  'cue_mode',
  'haptics',
  'parts',
  'program',
  'health_state',
];
const COLUMNS = COLUMN_NAMES.join(', ');

export function targetColumns(target: Target): [string, number] {
  return 'minutes' in target ? ['minutes', target.minutes] : ['rounds', target.rounds];
}

export function targetFrom(kind: string, value: number): Target {
  return kind === 'minutes' ? { minutes: value } : { rounds: value };
}

function sourceFrom(kind: string, ref: string | null): RecordSource | null {
  if (kind === 'custom') return { kind: 'custom' };
  if ((kind === 'technique' || kind === 'rhythm' || kind === 'routine') && ref) return { kind, id: ref };
  return null;
}

function parseJson(text: string | null): unknown {
  if (text === null) return null;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
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

const isOutcome = (v: unknown): v is 'completed' | 'ended' => v === 'completed' || v === 'ended';

function isTarget(v: unknown): v is Target {
  if (typeof v !== 'object' || v === null) return false;
  const t = v as Record<string, unknown>;
  return (typeof t.minutes === 'number' && t.minutes > 0) || (typeof t.rounds === 'number' && t.rounds > 0);
}

function isPart(v: unknown): v is PartRecord {
  if (typeof v !== 'object' || v === null) return false;
  const p = v as PartRecord;
  return (
    typeof p.name === 'string' &&
    (p.techniqueId === null || typeof p.techniqueId === 'string') &&
    isSnapshot(p.steps) &&
    isTarget(p.target) &&
    Number.isFinite(p.activeMs) &&
    Number.isInteger(p.completedRounds) &&
    p.completedRounds >= 0 &&
    Number.isFinite(p.breathsPerMinute) &&
    isOutcome(p.outcome)
  );
}

function isProgramTag(v: unknown): v is ProgramTag {
  if (typeof v !== 'object' || v === null) return false;
  const p = v as ProgramTag;
  return typeof p.id === 'string' && typeof p.name === 'string' && Number.isInteger(p.session) && p.session >= 1;
}

/**
 * Records are snapshots, so they are checked for shape and bounds but not
 * against today's library: a record keeps its original steps even if a
 * technique changes.
 */
export function recordFromRow(row: Row): SessionRecord | null {
  const source = sourceFrom(row.practice_kind, row.practice_ref);
  const steps = parseJson(row.steps);
  const parts = parseJson(row.parts);
  const program = parseJson(row.program);
  const cueMode = ['voice', 'tones', 'silent'].includes(row.cue_mode) ? (row.cue_mode as CueMode) : null;
  const health = HEALTH_STATES.find((h) => h === row.health_state);
  const partsOk = parts === null || (Array.isArray(parts) && parts.length >= 1 && parts.every(isPart));
  const programOk = program === null || isProgramTag(program);
  if (!source || !isOutcome(row.outcome) || !cueMode || !isSnapshot(steps) || !Number.isFinite(row.active_ms) || !partsOk || !programOk || !health) {
    return null;
  }
  return {
    id: row.id,
    startedAt: row.started_at,
    activeMs: row.active_ms,
    source,
    techniqueId: row.technique_id,
    name: row.name,
    steps,
    target: targetFrom(row.target_kind, row.target_value),
    completedRounds: row.completed_rounds,
    breathsPerMinute: row.breaths_per_minute,
    outcome: row.outcome,
    cueMode,
    haptics: row.haptics === 1,
    parts: parts as PartRecord[] | null,
    program: program as ProgramTag | null,
    health,
  };
}

function rowFrom(record: SessionRecord): Row {
  const [targetKind, targetValue] = targetColumns(record.target);
  return {
    id: record.id,
    started_at: record.startedAt,
    active_ms: Math.round(record.activeMs),
    practice_kind: record.source.kind,
    practice_ref: record.source.kind === 'custom' ? null : record.source.id,
    technique_id: record.techniqueId,
    name: record.name,
    steps: JSON.stringify(record.steps),
    target_kind: targetKind,
    target_value: targetValue,
    completed_rounds: record.completedRounds,
    breaths_per_minute: record.breathsPerMinute,
    outcome: record.outcome,
    cue_mode: record.cueMode,
    haptics: record.haptics ? 1 : 0,
    parts: record.parts ? JSON.stringify(record.parts) : null,
    program: record.program ? JSON.stringify(record.program) : null,
    health_state: record.health,
  };
}

/** Validates a record from outside storage (route params, import files) exactly as storage would read it. */
export function parseRecord(value: unknown): SessionRecord | null {
  if (typeof value !== 'object' || value === null) return null;
  const s = value as SessionRecord;
  if (typeof s.id !== 'string' || !s.id || typeof s.name !== 'string' || !Number.isFinite(s.startedAt)) return null;
  if (!Number.isInteger(s.completedRounds) || s.completedRounds < 0 || !Number.isFinite(s.breathsPerMinute)) return null;
  if (typeof s.source !== 'object' || s.source === null || !isTarget(s.target)) return null;
  if (s.techniqueId !== null && typeof s.techniqueId !== 'string') return null;
  try {
    // Records exported before v1.1 have no parts, program, or Health state.
    return recordFromRow(rowFrom({ ...s, parts: s.parts ?? null, program: s.program ?? null, health: s.health ?? 'none' }));
  } catch {
    return null;
  }
}

export function historyRepository(db: Db) {
  const read = (sql: string, params: (string | number)[]) =>
    db
      .getAllSync<Row>(sql, params)
      .map(recordFromRow)
      .filter((r): r is SessionRecord => r !== null);

  return {
    /** Idempotent: saving the same record twice keeps one. */
    save(record: SessionRecord): void {
      const row = rowFrom(record);
      db.runSync(
        `INSERT OR IGNORE INTO sessions (${COLUMNS}) VALUES (${COLUMN_NAMES.map(() => '?').join(', ')})`,
        COLUMN_NAMES.map((column) => row[column]),
      );
    },

    /** Newest first. */
    list(limit = 1000): SessionRecord[] {
      return read(`SELECT ${COLUMNS} FROM sessions ORDER BY started_at DESC LIMIT ?`, [limit]);
    },

    /** Records started in [fromMs, toMs), oldest first: the practice calendar's month. */
    between(fromMs: number, toMs: number): SessionRecord[] {
      return read(`SELECT ${COLUMNS} FROM sessions WHERE started_at >= ? AND started_at < ? ORDER BY started_at`, [fromMs, toMs]);
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

    setHealth(id: string, state: HealthState): void {
      db.runSync('UPDATE sessions SET health_state = ? WHERE id = ?', [state, id]);
    },

    /** Sessions in one Health state, oldest first (the write queue). */
    withHealth(state: HealthState): SessionRecord[] {
      return read(`SELECT ${COLUMNS} FROM sessions WHERE health_state = ? ORDER BY started_at`, [state]);
    },

    /** Removes practice records only; preferences, My rhythms, routines, and programs stay. */
    deleteAll(): void {
      db.runSync('DELETE FROM sessions', []);
    },
  };
}

export type HistoryRepository = ReturnType<typeof historyRepository>;
