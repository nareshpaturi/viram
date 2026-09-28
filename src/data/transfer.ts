/**
 * Export and import (FR-21). One versioned JSON file holds My rhythms,
 * history, and preferences. Import checks every rhythm with the share-link
 * rules and every record for shape; any problem rejects the whole file.
 * Merging is by record ID, so importing the same file twice adds nothing.
 */
import { parseRecord, type SessionRecord } from '../history/repository';
import { MAX_RHYTHMS, type SavedRhythm } from '../rhythms/repository';
import { parsePreferences, type Preferences } from '../settings/preferences';
import { findTechnique, validateRhythm } from '../sharing/link';
import type { Stores } from '../storage/stores';

export const EXPORT_FORMAT = 'viram-export';
export const EXPORT_VERSION = 1;
const MAX_SESSIONS = 100_000;

export interface ExportFile {
  format: typeof EXPORT_FORMAT;
  version: number;
  exportedAt: string;
  rhythms: SavedRhythm[];
  sessions: SessionRecord[];
  preferences: Partial<Preferences>;
}

/** First-use state and one-time tips belong to the device, not the file. */
const DEVICE_ONLY: (keyof Preferences)[] = ['firstUseComplete', 'lockTipSeen', 'introductionsHeard'];

export function buildExport(stores: Stores, now = new Date()): ExportFile {
  const preferences: Partial<Preferences> = { ...stores.preferences.read() };
  for (const key of DEVICE_ONLY) delete preferences[key];
  return {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exportedAt: now.toISOString(),
    rhythms: stores.rhythms.list(),
    sessions: stores.history.list(MAX_SESSIONS),
    preferences,
  };
}

export function exportFileName(now = new Date()): string {
  return `viram-export-${now.toISOString().slice(0, 10)}.json`;
}

export interface ImportPlan {
  rhythms: { found: number; newItems: SavedRhythm[] };
  sessions: { found: number; newItems: SessionRecord[] };
  /** Applied only when this device has no rhythms or history yet. */
  preferences: Partial<Preferences> | null;
}

export type ImportCheck =
  | { ok: true; plan: ImportPlan }
  | { ok: false; reason: 'invalid' | 'newer' | 'limit' };

function checkRhythm(value: unknown): SavedRhythm | null {
  if (typeof value !== 'object' || value === null) return null;
  const r = value as SavedRhythm;
  if (typeof r.id !== 'string' || !r.id || !['custom', 'adjusted', 'link'].includes(r.origin)) return null;
  if (!Number.isFinite(r.createdAt) || !Number.isFinite(r.updatedAt)) return null;
  const checked = validateRhythm({ name: r.name, steps: r.steps, target: r.target, techniqueId: r.techniqueId ?? null });
  return checked && { id: r.id, ...checked, origin: r.origin, createdAt: r.createdAt, updatedAt: r.updatedAt };
}

function checkSession(value: unknown): SessionRecord | null {
  const record = parseRecord(value);
  // Imported records may only name techniques this app has.
  if (!record || (record.techniqueId !== null && !findTechnique(record.techniqueId))) return null;
  return record;
}

export function checkImport(text: string, stores: Stores): ImportCheck {
  let file: Partial<ExportFile>;
  try {
    file = JSON.parse(text);
  } catch {
    return { ok: false, reason: 'invalid' };
  }
  if (typeof file !== 'object' || file === null || file.format !== EXPORT_FORMAT) return { ok: false, reason: 'invalid' };
  if (typeof file.version !== 'number' || file.version > EXPORT_VERSION) return { ok: false, reason: 'newer' };
  if (!Array.isArray(file.rhythms) || !Array.isArray(file.sessions) || file.sessions.length > MAX_SESSIONS) {
    return { ok: false, reason: 'invalid' };
  }
  const rhythms = file.rhythms.map(checkRhythm);
  const sessions = file.sessions.map(checkSession);
  if (rhythms.some((r) => r === null) || sessions.some((s) => s === null)) return { ok: false, reason: 'invalid' };

  const existingRhythms = new Set(stores.rhythms.list().map((r) => r.id));
  const newRhythms = (rhythms as SavedRhythm[]).filter((r) => !existingRhythms.has(r.id));
  if (existingRhythms.size + newRhythms.length > MAX_RHYTHMS) return { ok: false, reason: 'limit' };
  const newSessions = (sessions as SessionRecord[]).filter((s) => !stores.history.has(s.id));
  const fresh = existingRhythms.size === 0 && stores.history.count() === 0;
  const preferences = typeof file.preferences === 'object' && file.preferences !== null ? parsePreferences(file.preferences) : {};
  for (const key of DEVICE_ONLY) delete preferences[key];

  return {
    ok: true,
    plan: {
      rhythms: { found: rhythms.length, newItems: newRhythms },
      sessions: { found: sessions.length, newItems: newSessions },
      preferences: fresh ? preferences : null,
    },
  };
}

/** All or nothing, in one transaction. */
export function applyImport(plan: ImportPlan, stores: Stores): void {
  stores.transaction(() => {
    for (const rhythm of plan.rhythms.newItems) stores.rhythms.insertImported(rhythm);
    for (const session of plan.sessions.newItems) stores.history.save(session);
    if (plan.preferences) stores.preferences.write(plan.preferences);
  });
}
