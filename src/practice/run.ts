/**
 * What the practice screen runs: one practice, or a routine of 2–6
 * (FR-14), optionally as a program session (FR-20).
 */
import { cleanName } from '../sharing/link';
import { parsePractice, type Practice } from './practice';

export const MAX_ROUTINE_PARTS = 6;

export interface ProgramSessionRef {
  programId: string;
  programName: string;
  /** 1-based session number within the program. */
  session: number;
  total: number;
}

export interface PracticeRun {
  name: string;
  parts: Practice[];
  routineId: string | null;
  program: ProgramSessionRef | null;
}

export function singleRun(practice: Practice): PracticeRun {
  return { name: practice.name, parts: [practice], routineId: null, program: null };
}

function parseProgramRef(value: unknown): ProgramSessionRef | null | undefined {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'object') return undefined;
  const p = value as ProgramSessionRef;
  const ok =
    typeof p.programId === 'string' &&
    typeof p.programName === 'string' &&
    Number.isInteger(p.session) &&
    Number.isInteger(p.total) &&
    p.session >= 1 &&
    p.session <= p.total;
  return ok ? { programId: p.programId, programName: p.programName, session: p.session, total: p.total } : undefined;
}

/** Validates a run from route params: every part passes the share-link rules. */
export function parseRun(value: unknown): PracticeRun | null {
  if (typeof value !== 'object' || value === null) return null;
  const v = value as Partial<PracticeRun>;
  if (!Array.isArray(v.parts) || v.parts.length < 1 || v.parts.length > MAX_ROUTINE_PARTS) return null;
  const multi = v.parts.length > 1 || v.program != null;
  const parts = v.parts.map((part) => parsePractice(part, { anyMinutes: multi }));
  if (parts.some((p) => p === null)) return null;
  const name = cleanName(String(v.name ?? ''));
  const program = parseProgramRef(v.program);
  if (!name || program === undefined) return null;
  const routineId = typeof v.routineId === 'string' ? v.routineId : null;
  return { name, parts: parts as Practice[], routineId, program };
}
