/**
 * Routines (FR-14): 2–6 practices, each a library technique or a saved
 * rhythm, with its own minutes. A practice may appear more than once.
 * Segments hold references; the practices are resolved when a routine runs.
 */
import { MAX_SEGMENT_MINUTES } from '../breathing/rhythm';
import { practiceFromTechnique, type Practice } from '../practice/practice';
import { MAX_ROUTINE_PARTS, type PracticeRun } from '../practice/run';
import { practiceFromRhythm } from '../rhythms/describe';
import type { RhythmsRepository } from '../rhythms/repository';
import { cleanName, findTechnique } from '../sharing/link';
import { newId, type Db } from '../storage/db';

export const MIN_ROUTINE_PARTS = 2;
export const MAX_ROUTINES = 20;

export type SegmentRef = { kind: 'technique'; id: string } | { kind: 'rhythm'; id: string };

export interface RoutineSegment {
  ref: SegmentRef;
  minutes: number;
}

export interface Routine {
  id: string;
  name: string;
  segments: RoutineSegment[];
  createdAt: number;
  updatedAt: number;
}

export type RoutineSaveResult = { ok: true; routine: Routine } | { ok: false; reason: 'invalid' | 'limit' };

function isSegment(value: unknown): value is RoutineSegment {
  if (typeof value !== 'object' || value === null) return false;
  const s = value as RoutineSegment;
  return (
    typeof s.ref === 'object' &&
    s.ref !== null &&
    (s.ref.kind === 'technique' || s.ref.kind === 'rhythm') &&
    typeof s.ref.id === 'string' &&
    Number.isInteger(s.minutes) &&
    s.minutes >= 1 &&
    s.minutes <= MAX_SEGMENT_MINUTES
  );
}

/** Plain-text name and 2–6 well-formed segments; library references must exist. */
export function validateRoutine(name: string, segments: unknown): { name: string; segments: RoutineSegment[] } | null {
  const clean = cleanName(name);
  if (!clean || !Array.isArray(segments)) return null;
  if (segments.length < MIN_ROUTINE_PARTS || segments.length > MAX_ROUTINE_PARTS || !segments.every(isSegment)) return null;
  if (segments.some((s) => s.ref.kind === 'technique' && !findTechnique(s.ref.id))) return null;
  return { name: clean, segments: segments.map((s) => ({ ref: { kind: s.ref.kind, id: s.ref.id }, minutes: s.minutes })) };
}

/** The practice a segment points at, or null when a saved rhythm was deleted. */
export function resolveSegment(segment: RoutineSegment, rhythms: Pick<RhythmsRepository, 'get'>): Practice | null {
  const target = { minutes: segment.minutes };
  if (segment.ref.kind === 'technique') {
    const technique = findTechnique(segment.ref.id);
    return technique ? { ...practiceFromTechnique(technique), target } : null;
  }
  const rhythm = rhythms.get(segment.ref.id);
  return rhythm ? { ...practiceFromRhythm(rhythm), target } : null;
}

/** A runnable routine, or the positions of practices that no longer exist. */
export function routineRun(routine: Routine, rhythms: Pick<RhythmsRepository, 'get'>): { run: PracticeRun } | { missing: number[] } {
  const parts = routine.segments.map((s) => resolveSegment(s, rhythms));
  const missing = parts.flatMap((p, i) => (p ? [] : [i]));
  if (missing.length) return { missing };
  return { run: { name: routine.name, parts: parts as Practice[], routineId: routine.id, program: null } };
}

interface Row {
  id: string;
  name: string;
  segments: string;
  created_at: number;
  updated_at: number;
}

function fromRow(row: Row): Routine | null {
  let segments: unknown;
  try {
    segments = JSON.parse(row.segments);
  } catch {
    return null;
  }
  const checked = validateRoutine(row.name, segments);
  return checked && { id: row.id, ...checked, createdAt: row.created_at, updatedAt: row.updated_at };
}

export function routinesRepository(db: Db, now: () => number = Date.now) {
  const get = (id: string): Routine | null => {
    const row = db.getFirstSync<Row>('SELECT id, name, segments, created_at, updated_at FROM routines WHERE id = ?', [id]);
    return row ? fromRow(row) : null;
  };
  const count = (): number => db.getFirstSync<{ n: number }>('SELECT COUNT(*) AS n FROM routines', [])?.n ?? 0;

  return {
    get,
    count,

    list(): Routine[] {
      return db
        .getAllSync<Row>('SELECT id, name, segments, created_at, updated_at FROM routines ORDER BY updated_at DESC', [])
        .map(fromRow)
        .filter((r): r is Routine => r !== null);
    },

    /** Creates a routine, or replaces the one with `id` (import keeps the file's ID). */
    save(input: { id?: string; name: string; segments: RoutineSegment[]; createdAt?: number }): RoutineSaveResult {
      const checked = validateRoutine(input.name, input.segments);
      if (!checked) return { ok: false, reason: 'invalid' };
      const existing = input.id ? get(input.id) : null;
      if (!existing && count() >= MAX_ROUTINES) return { ok: false, reason: 'limit' };
      const time = now();
      const routine: Routine = {
        id: input.id ?? newId(),
        ...checked,
        createdAt: existing?.createdAt ?? input.createdAt ?? time,
        updatedAt: time,
      };
      db.runSync('INSERT OR REPLACE INTO routines (id, name, segments, created_at, updated_at) VALUES (?, ?, ?, ?, ?)', [
        routine.id,
        routine.name,
        JSON.stringify(routine.segments),
        routine.createdAt,
        routine.updatedAt,
      ]);
      return { ok: true, routine };
    },

    remove(id: string): void {
      db.runSync('DELETE FROM routines WHERE id = ?', [id]);
    },
  };
}

export type RoutinesRepository = ReturnType<typeof routinesRepository>;
