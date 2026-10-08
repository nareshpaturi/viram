/**
 * Program enrollments (FR-20), one row per program: its state, sessions
 * completed, the practice plan, and a snapshot of the definition. At most
 * one is active at a time.
 */
import { MAX_ROUTINE_PARTS } from '../practice/run';
import { newId, type Db } from '../storage/db';
import type { Program, ProgramPhase } from './definitions';
import { sessionPractices, type Enrollment, type EnrollmentState, type PracticePlan } from './engine';

interface Row {
  id: string;
  program_id: string;
  content_version: number;
  definition: string;
  state: string;
  completed_sessions: number;
  plan: string | null;
  started_at: number;
  updated_at: number;
  last_session_at: number | null;
}

const COLUMNS = 'id, program_id, content_version, definition, state, completed_sessions, plan, started_at, updated_at, last_session_at';

const text = (v: unknown): v is string => typeof v === 'string' && v.length > 0;
const optionalText = (v: unknown) => v === undefined || typeof v === 'string';

/**
 * A program snapshot every program screen can show and every session can
 * run: all its words, and each session's parts as runnable library
 * practices within their bounds (QA F07, AQ-05).
 */
function isProgram(v: unknown): v is Program {
  if (typeof v !== 'object' || v === null) return false;
  const p = v as Program;
  if (![p.id, p.name, p.shortName, p.eyebrow, p.description, p.summary].every(text) || !Number.isInteger(p.version)) return false;
  if (!(p.next === null || text(p.next))) return false;
  if (!Array.isArray(p.sessions) || p.sessions.length === 0) return false;
  const sessionsOk = p.sessions.every(
    (s) =>
      typeof s === 'object' &&
      s !== null &&
      Array.isArray(s.parts) &&
      s.parts.length > 0 &&
      s.parts.length <= MAX_ROUTINE_PARTS &&
      s.parts.every((part) => typeof part === 'object' && part !== null && text(part.techniqueId) && Number.isInteger(part.minutes)) &&
      optionalText(s.label) &&
      optionalText(s.introduces) &&
      sessionPractices(s) !== null,
  );
  return sessionsOk && (p.phases === null || (Array.isArray(p.phases) && p.phases.every((phase) => isPhase(phase, p.sessions.length))));
}

function isPhase(v: unknown, sessions: number): v is ProgramPhase {
  if (typeof v !== 'object' || v === null) return false;
  const phase = v as ProgramPhase;
  return Number.isInteger(phase.first) && Number.isInteger(phase.last) && phase.first >= 1 && phase.first <= phase.last && phase.last <= sessions && text(phase.summary) && text(phase.intro);
}

function isPlan(v: unknown): v is PracticePlan {
  if (typeof v !== 'object' || v === null) return false;
  const p = v as PracticePlan;
  return ['morning', 'midday', 'evening', 'custom'].includes(p.time) && Number.isInteger(p.hour) && p.hour >= 0 && p.hour < 24 && Number.isInteger(p.minute) && p.minute >= 0 && p.minute < 60;
}

const parse = (text: string | null): unknown => {
  if (text === null) return null;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
};

/** Checks a stored or imported enrollment; anything malformed is left out. */
export function enrollmentFrom(value: unknown): Enrollment | null {
  if (typeof value !== 'object' || value === null) return null;
  const e = value as Enrollment;
  const states: EnrollmentState[] = ['active', 'left', 'completed'];
  if (typeof e.id !== 'string' || typeof e.programId !== 'string' || !isProgram(e.definition) || e.definition.id !== e.programId) return null;
  if (!states.includes(e.state) || !Number.isInteger(e.completedSessions) || e.completedSessions < 0 || e.completedSessions > e.definition.sessions.length) return null;
  if (!Number.isFinite(e.startedAt) || !Number.isFinite(e.updatedAt) || (e.lastSessionAt !== null && !Number.isFinite(e.lastSessionAt))) return null;
  if (e.plan !== null && !isPlan(e.plan)) return null;
  return { ...e, contentVersion: Number.isInteger(e.contentVersion) ? e.contentVersion : e.definition.version };
}

function fromRow(row: Row): Enrollment | null {
  return enrollmentFrom({
    id: row.id,
    programId: row.program_id,
    contentVersion: row.content_version,
    definition: parse(row.definition),
    state: row.state,
    completedSessions: row.completed_sessions,
    plan: parse(row.plan) ?? null,
    startedAt: row.started_at,
    updatedAt: row.updated_at,
    lastSessionAt: row.last_session_at,
  });
}

export function programsRepository(db: Db) {
  const all = (): Enrollment[] =>
    db
      .getAllSync<Row>(`SELECT ${COLUMNS} FROM enrollments ORDER BY updated_at DESC`, [])
      .map(fromRow)
      .filter((e): e is Enrollment => e !== null);

  const save = (e: Enrollment): void => {
    db.runSync(`INSERT OR REPLACE INTO enrollments (${COLUMNS}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
      e.id,
      e.programId,
      e.contentVersion,
      JSON.stringify(e.definition),
      e.state,
      e.completedSessions,
      e.plan ? JSON.stringify(e.plan) : null,
      e.startedAt,
      e.updatedAt,
      e.lastSessionAt,
    ]);
  };

  return {
    all,
    save,
    newId,
    active: (): Enrollment | null => all().find((e) => e.state === 'active') ?? null,
    /** The enrollment for a program, whatever its state. */
    forProgram: (programId: string): Enrollment | null => all().find((e) => e.programId === programId) ?? null,

    /** Makes `e` the one active program; any other active one is left, keeping its progress. */
    activate(e: Enrollment, now: number): void {
      db.withTransactionSync(() => {
        for (const other of all()) {
          if (other.state === 'active' && other.id !== e.id) save({ ...other, state: 'left', updatedAt: now });
        }
        save(e);
      });
    },
  };
}

export type ProgramsRepository = ReturnType<typeof programsRepository>;
