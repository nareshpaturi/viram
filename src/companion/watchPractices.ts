import { LIBRARY } from '../content/library';
import type { HealthState, ProgramTag, SessionRecord } from '../history/repository';
import { healthEligible } from '../health/health';
import { practiceFromTechnique, quickBox } from '../practice/practice';
import { readyPractice } from '../practice/ready';
import { nextSessionNumber, recordSession, sessionRun } from '../programs/engine';
import { practiceFromRhythm } from '../rhythms/describe';
import type { Preferences } from '../settings/preferences';
import type { Stores } from '../storage/stores';
import { companionContext, recordFromWatch, type CompanionContext, type WatchOffer } from './companion';

/** My rhythms on the watch, most recent first; the library always fits after them. */
export const MAX_WATCH_RHYTHMS = 10;

/**
 * The active program's next session, as Breathe offers it (FR-20), when it
 * is one practice: the watch runs one rhythm at a time, so a sequence stays
 * on the phone.
 */
function programOffer(stores: Pick<Stores, 'programs'>): WatchOffer | null {
  const enrollment = stores.programs.active();
  if (!enrollment) return null;
  const session = nextSessionNumber(enrollment);
  const run = sessionRun(enrollment.definition, session);
  if (!run || run.parts.length !== 1) return null;
  return { practice: run.parts[0], program: { id: enrollment.programId, name: enrollment.definition.name, session } };
}

/**
 * What the watch offers, in order: Breathe's practice (a program's next
 * session, then the ready practice), 5-minute box breathing, the most recent
 * of My rhythms, then every practice in the library (QA W06, W08).
 */
export function watchContext(preferences: Preferences, stores: Pick<Stores, 'rhythms' | 'programs'>, now: number): CompanionContext {
  const program = programOffer(stores);
  const offers: WatchOffer[] = [
    ...(program ? [program] : []),
    { practice: readyPractice(preferences, stores as Stores) },
    { practice: quickBox() },
    ...stores.rhythms
      .list()
      .slice(0, MAX_WATCH_RHYTHMS)
      .map((r) => ({ practice: practiceFromRhythm(r) })),
    ...LIBRARY.map((t) => ({ practice: practiceFromTechnique(t) })),
  ];
  return companionContext(offers, preferences, now);
}

/** The program tag, if the record really is that program's session as the phone has it. */
function checkedProgram(record: SessionRecord, stores: Pick<Stores, 'programs'>): ProgramTag | null {
  const tag = record.program;
  const enrollment = tag ? stores.programs.forProgram(tag.id) : null;
  if (!tag || !enrollment) return null;
  const part = sessionRun(enrollment.definition, tag.session)?.parts;
  const same =
    part?.length === 1 &&
    part[0].techniqueId === record.techniqueId &&
    JSON.stringify(part[0].target) === JSON.stringify(record.target) &&
    part[0].steps.length === record.steps.length &&
    part[0].steps.every((s, i) => s.kind === record.steps[i].kind && s.seconds === record.steps[i].seconds);
  return same ? { id: enrollment.programId, name: enrollment.definition.name, session: tag.session } : null;
}

/**
 * Saves sessions the watch sent and returns the ids to acknowledge: every
 * session read, kept or not, so an invalid one isn't offered again. Saving
 * is idempotent by id. A program session counts toward its program as it
 * would on the phone.
 */
export function saveWatchSessions(
  pending: readonly string[],
  stores: Pick<Stores, 'history' | 'programs'>,
  preferences: Pick<Preferences, 'healthConnected'>,
  now: number,
): { saved: SessionRecord[]; ids: string[] } {
  const saved: SessionRecord[] = [];
  const ids: string[] = [];
  for (const json of pending) {
    let value: unknown;
    try {
      value = JSON.parse(json);
    } catch {
      continue;
    }
    const id = typeof value === 'object' && value !== null ? (value as { id?: unknown }).id : undefined;
    if (typeof id === 'string') ids.push(id);
    const read = recordFromWatch(value, now);
    if (!read || stores.history.has(read.id)) continue;
    const record = { ...read, program: checkedProgram(read, stores) };
    const health: HealthState = preferences.healthConnected && healthEligible(record) ? 'pending' : 'none';
    stores.history.save({ ...record, health });
    saved.push(record);
    const enrollment = record.program && stores.programs.forProgram(record.program.id);
    if (enrollment) {
      const counted = recordSession(enrollment, record, now);
      if (counted !== enrollment) stores.programs.save(counted);
    }
  }
  return { saved, ids };
}
