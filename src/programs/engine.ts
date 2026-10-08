/**
 * Program progress (FR-20). Progress counts completed sessions, never
 * calendar days: an ended-early session doesn't count and stays next, a
 * missed day changes nothing, and there are no streaks or resets. Other
 * practices never advance or break a program. Everything here is pure.
 */
import { describeTarget } from '../breathing/describe';
import { plannedDurationMs, sessionPlan } from '../breathing/session';
import type { SessionRecord } from '../history/repository';
import { practiceFromTechnique, type Practice } from '../practice/practice';
import type { PracticeRun } from '../practice/run';
import { findTechnique, validateRhythm } from '../sharing/link';
import type { Program, ProgramPhase, ProgramSession } from './definitions';

export const WELCOME_BACK_MS = 7 * 24 * 60 * 60 * 1000;

export type EnrollmentState = 'active' | 'left' | 'completed';
export type PracticeTime = 'morning' | 'midday' | 'evening' | 'custom';

/** “When will you practise?” Optional; a program works without it. */
export interface PracticePlan {
  time: PracticeTime;
  hour: number;
  minute: number;
}

export const PRACTICE_TIMES: Record<Exclude<PracticeTime, 'custom'>, { label: string; detail: string; hour: number; minute: number }> = {
  morning: { label: 'Morning', detail: 'After waking, before breakfast', hour: 7, minute: 30 },
  midday: { label: 'Midday', detail: 'A pause in the day', hour: 12, minute: 30 },
  evening: { label: 'Evening', detail: 'Before winding down', hour: 21, minute: 0 },
};

export interface Enrollment {
  id: string;
  programId: string;
  contentVersion: number;
  /** The program as it was when started. */
  definition: Program;
  state: EnrollmentState;
  completedSessions: number;
  plan: PracticePlan | null;
  startedAt: number;
  updatedAt: number;
  lastSessionAt: number | null;
}

export const totalSessions = (e: Pick<Enrollment, 'definition'>) => e.definition.sessions.length;

/** 1-based; the last session once every session is done. */
export const nextSessionNumber = (e: Enrollment) => Math.min(e.completedSessions + 1, totalSessions(e));

/** One part as a practice, checked against the installed library like a link. */
function partPractice(part: ProgramSession['parts'][number]): Practice | null {
  const technique = findTechnique(part.techniqueId);
  if (!technique) return null;
  const base = practiceFromTechnique(technique);
  const steps = part.seconds && part.seconds.length === base.steps.length ? base.steps.map((s, i) => ({ ...s, seconds: part.seconds![i] })) : base.steps;
  const target = { minutes: part.minutes };
  return validateRhythm({ name: base.name, steps, target, techniqueId: technique.id }) ? { ...base, steps, target } : null;
}

export function sessionPractices(session: ProgramSession): Practice[] | null {
  const parts = session.parts.map(partPractice);
  return parts.every(Boolean) ? (parts as Practice[]) : null;
}

/** “Sama Vritti”, or “Ujjayi → Nadi Shodhana”. */
export function sessionTitle(session: ProgramSession): string {
  return session.parts.map((p) => findTechnique(p.techniqueId)?.name ?? p.techniqueId).join(' → ');
}

export function sessionDurationMs(session: ProgramSession): number {
  const parts = sessionPractices(session);
  return parts ? plannedDurationMs(parts.map((p) => sessionPlan(p.steps, p.target))) : 0;
}

/** “Nadi Shodhana · 5 min”, or “Ujjayi → Nadi Shodhana · 8 min”. */
export function sessionLine(session: ProgramSession): string {
  return `${sessionTitle(session)} · ${session.parts.reduce((sum, p) => sum + p.minutes, 0)} min`;
}

/** “Box breathing · 3 min”, or “Your first sequence · 8 min”. */
export function sessionSubtitle(session: ProgramSession): string {
  const minutes = session.parts.reduce((sum, p) => sum + p.minutes, 0);
  if (session.parts.length > 1) return `${session.label ?? 'A sequence'} · ${minutes} min`;
  const technique = findTechnique(session.parts[0].techniqueId);
  return `${technique?.subtitle ?? ''} · ${describeTarget({ minutes })}`;
}

/** What Begin runs for session `n` (1-based), or null if the library no longer has a part. */
export function sessionRun(program: Program, n: number): PracticeRun | null {
  const session = program.sessions[n - 1];
  const parts = session && sessionPractices(session);
  if (!parts) return null;
  return {
    name: parts.length === 1 ? parts[0].name : sessionTitle(session),
    parts,
    routineId: null,
    program: { programId: program.id, programName: program.name, session: n, total: program.sessions.length },
  };
}

export function programTotals(program: Program): { minutes: number; techniques: string[] } {
  const ms = program.sessions.reduce((sum, s) => sum + sessionDurationMs(s), 0);
  const techniques = [...new Set(program.sessions.flatMap((s) => s.parts.map((p) => findTechnique(p.techniqueId)?.name ?? p.techniqueId)))];
  return { minutes: Math.round(ms / 60_000), techniques };
}

export function start(program: Program, id: string, plan: PracticePlan | null, now: number): Enrollment {
  return {
    id,
    programId: program.id,
    contentVersion: program.version,
    definition: program,
    state: 'active',
    completedSessions: 0,
    plan,
    startedAt: now,
    updatedAt: now,
    lastSessionAt: null,
  };
}

/**
 * Counts a saved record: only a completed session of this program that is
 * the next one. Anything else, including saving the same record twice,
 * leaves the enrollment as it is.
 */
export function recordSession(e: Enrollment, record: SessionRecord, now: number): Enrollment {
  if (e.state !== 'active' || record.outcome !== 'completed' || record.program?.id !== e.programId) return e;
  if (record.program.session !== e.completedSessions + 1) return e;
  const completedSessions = e.completedSessions + 1;
  return { ...e, completedSessions, lastSessionAt: now, updatedAt: now, state: completedSessions >= totalSessions(e) ? 'completed' : 'active' };
}

/** The phase that session `n` finishes, when another phase follows. */
export function phaseEndingAt(program: Program, n: number): { done: ProgramPhase; next: ProgramPhase; number: number } | null {
  const phases = program.phases;
  if (!phases) return null;
  const index = phases.findIndex((p) => p.last === n);
  return index >= 0 && index < phases.length - 1 ? { done: phases[index], next: phases[index + 1], number: index + 1 } : null;
}

/** “Repeat this phase”: its sessions become next again. */
export function repeatPhase(e: Enrollment, phase: ProgramPhase, now: number): Enrollment {
  return { ...e, completedSessions: phase.first - 1, state: 'active', updatedAt: now };
}

/**
 * After 7 days or more away, Breathe offers “Continue with session N” or
 * “Repeat session N−1”. Choosing either (or anything) resets the clock.
 */
export function welcomeBack(e: Enrollment, now: number): { next: number; repeat: number } | null {
  if (e.state !== 'active' || e.completedSessions < 1 || e.lastSessionAt === null) return null;
  if (now - Math.max(e.lastSessionAt, e.updatedAt) < WELCOME_BACK_MS) return null;
  return { next: nextSessionNumber(e), repeat: e.completedSessions };
}

export function repeatPrevious(e: Enrollment, now: number): Enrollment {
  return { ...e, completedSessions: Math.max(0, e.completedSessions - 1), updatedAt: now };
}

export const acknowledge = (e: Enrollment, now: number): Enrollment => ({ ...e, updatedAt: now });

/** Leaving keeps progress to resume later; Restart begins again at session 1. */
export const leave = (e: Enrollment, now: number): Enrollment => ({ ...e, state: 'left', updatedAt: now });
export const resume = (e: Enrollment, now: number): Enrollment => ({ ...e, state: 'active', updatedAt: now });
export const restart = (e: Enrollment, now: number): Enrollment => ({ ...e, state: 'active', completedSessions: 0, lastSessionAt: null, updatedAt: now });
