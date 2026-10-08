/**
 * My rhythms (FR-10): up to 20 named rhythms saved from the custom builder,
 * an adjusted library technique, or a received link. Every rhythm passes the
 * share-link rules on the way in and on the way out.
 */
import { checkSlowing, type RhythmStep, type Slowing, type Target } from '../breathing/rhythm';
import { newId, type Db } from '../storage/db';
import { targetColumns, targetFrom } from '../history/repository';
import { validateRhythm } from '../sharing/link';

export const MAX_RHYTHMS = 20;

export type RhythmOrigin = 'custom' | 'adjusted' | 'link';

export interface SavedRhythm {
  id: string;
  name: string;
  steps: RhythmStep[];
  target: Target;
  techniqueId: string | null;
  /** Gradual slowing (FR-24), for coherent breathing and custom rhythms. */
  slowing: Slowing | null;
  origin: RhythmOrigin;
  createdAt: number;
  updatedAt: number;
}

export type SaveResult =
  | { ok: true; rhythm: SavedRhythm }
  | { ok: false; reason: 'limit' | 'invalid' | 'duplicate'; existing?: SavedRhythm };

interface Row {
  id: string;
  name: string;
  steps: string;
  target_kind: string;
  target_value: number;
  technique_id: string | null;
  source: string;
  created_at: number;
  updated_at: number;
  slowing: string | null;
}

const COLUMNS = 'id, name, steps, target_kind, target_value, technique_id, source, created_at, updated_at, slowing';

function fromRow(row: Row): SavedRhythm | null {
  let steps: unknown;
  try {
    steps = JSON.parse(row.steps);
  } catch {
    return null;
  }
  const origin = (['custom', 'adjusted', 'link'] as const).find((o) => o === row.source);
  const checked = validateRhythm({
    name: row.name,
    steps: steps as RhythmStep[],
    target: targetFrom(row.target_kind, row.target_value),
    techniqueId: row.technique_id,
  }, { longHolds: true });
  if (!checked || !origin) return null;
  let slowing: unknown = null;
  try {
    slowing = row.slowing === null ? null : JSON.parse(row.slowing);
  } catch {
    // Unreadable slowing is dropped; the rhythm stays.
  }
  return { id: row.id, ...checked, slowing: checkSlowing(checked.techniqueId, checked.steps, slowing) || null, origin, createdAt: row.created_at, updatedAt: row.updated_at };
}

/** Same name, steps, and target: saving again would add nothing. */
export function sameRhythm(a: Omit<SavedRhythm, 'id' | 'origin' | 'createdAt' | 'updatedAt'>, b: typeof a): boolean {
  return (
    a.name === b.name &&
    a.techniqueId === b.techniqueId &&
    JSON.stringify(a.target) === JSON.stringify(b.target) &&
    JSON.stringify(a.slowing ?? null) === JSON.stringify(b.slowing ?? null) &&
    a.steps.length === b.steps.length &&
    a.steps.every((s, i) => s.kind === b.steps[i].kind && s.seconds === b.steps[i].seconds && s.side === b.steps[i].side)
  );
}

export function rhythmsRepository(db: Db, now: () => number = Date.now) {
  const list = (): SavedRhythm[] =>
    db
      .getAllSync<Row>(`SELECT ${COLUMNS} FROM rhythms ORDER BY updated_at DESC`, [])
      .map(fromRow)
      .filter((r): r is SavedRhythm => r !== null);

  const get = (id: string): SavedRhythm | null => {
    const row = db.getFirstSync<Row>(`SELECT ${COLUMNS} FROM rhythms WHERE id = ?`, [id]);
    return row ? fromRow(row) : null;
  };

  const insert = (rhythm: SavedRhythm): void => {
    const [targetKind, targetValue] = targetColumns(rhythm.target);
    db.runSync(`INSERT INTO rhythms (${COLUMNS}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
      rhythm.id,
      rhythm.name,
      JSON.stringify(rhythm.steps),
      targetKind,
      targetValue,
      rhythm.techniqueId,
      rhythm.origin,
      rhythm.createdAt,
      rhythm.updatedAt,
      rhythm.slowing ? JSON.stringify(rhythm.slowing) : null,
    ]);
  };

  const count = (): number => db.getFirstSync<{ n: number }>('SELECT COUNT(*) AS n FROM rhythms', [])?.n ?? 0;

  return {
    list,
    get,
    count,

    /** Never overwrites: at 20 it reports the limit, and an identical rhythm reports the duplicate. */
    save(input: { name: string; steps: RhythmStep[]; target: Target; techniqueId: string | null; slowing?: Slowing | null; origin: RhythmOrigin }): SaveResult {
      const valid = validateRhythm(input, { longHolds: true });
      const slowing = valid && checkSlowing(valid.techniqueId, valid.steps, input.slowing);
      if (!valid || slowing === false) return { ok: false, reason: 'invalid' };
      const checked = { ...valid, slowing };
      const existing = list().find((r) => sameRhythm(r, checked));
      if (existing) return { ok: false, reason: 'duplicate', existing };
      if (count() >= MAX_RHYTHMS) return { ok: false, reason: 'limit' };
      const time = now();
      const rhythm: SavedRhythm = { id: newId(), ...checked, origin: input.origin, createdAt: time, updatedAt: time };
      insert(rhythm);
      return { ok: true, rhythm };
    },

    /** Import keeps the record ID so a second import merges instead of duplicating. */
    insertImported(rhythm: SavedRhythm): void {
      insert(rhythm);
    },

    rename(id: string, name: string): SavedRhythm | null {
      const current = get(id);
      const checked = current && validateRhythm({ ...current, name }, { longHolds: true });
      if (!current || !checked) return null;
      db.runSync('UPDATE rhythms SET name = ?, updated_at = ? WHERE id = ?', [checked.name, now(), id]);
      return get(id);
    },

    /** History keeps its own snapshots, so deleting a rhythm never changes records. */
    remove(id: string): void {
      db.runSync('DELETE FROM rhythms WHERE id = ?', [id]);
    },
  };
}

export type RhythmsRepository = ReturnType<typeof rhythmsRepository>;
