/**
 * Local database and its forward-only migrations (FR-05, FR-21).
 *
 * The file lives in expo-sqlite's default directory: Documents/SQLite on iOS
 * (included in device and iCloud backups) and the app's files directory on
 * Android (included in Auto Backup). Each migration runs in one transaction,
 * so a failure leaves the previous schema and data untouched.
 */

/** The subset of expo-sqlite's synchronous API the repositories use. */
export interface Db {
  execSync(source: string): void;
  runSync(source: string, params: (string | number | null)[]): unknown;
  getAllSync<T>(source: string, params: (string | number | null)[]): T[];
  getFirstSync<T>(source: string, params: (string | number | null)[]): T | null;
  withTransactionSync(task: () => void): void;
}

export const DATABASE_NAME = 'viram.sqlite';

/** Append only. Never edit a released migration. */
export const MIGRATIONS: readonly string[] = [
  // 1 · v1.0 schema
  `
  CREATE TABLE sessions (
    id TEXT PRIMARY KEY NOT NULL,
    started_at INTEGER NOT NULL,
    active_ms INTEGER NOT NULL CHECK (active_ms >= 0),
    practice_kind TEXT NOT NULL CHECK (practice_kind IN ('technique', 'rhythm', 'custom')),
    practice_ref TEXT,
    technique_id TEXT,
    name TEXT NOT NULL,
    steps TEXT NOT NULL,
    target_kind TEXT NOT NULL CHECK (target_kind IN ('minutes', 'rounds')),
    target_value INTEGER NOT NULL,
    completed_rounds INTEGER NOT NULL CHECK (completed_rounds >= 0),
    breaths_per_minute REAL NOT NULL,
    outcome TEXT NOT NULL CHECK (outcome IN ('completed', 'ended')),
    cue_mode TEXT NOT NULL,
    haptics INTEGER NOT NULL
  );
  CREATE INDEX sessions_started_at ON sessions (started_at DESC);

  CREATE TABLE rhythms (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    steps TEXT NOT NULL,
    target_kind TEXT NOT NULL CHECK (target_kind IN ('minutes', 'rounds')),
    target_value INTEGER NOT NULL,
    technique_id TEXT,
    source TEXT NOT NULL CHECK (source IN ('custom', 'adjusted', 'link')),
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE preferences (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );
  `,
  // 2 · v1.1: routines, programs, and Health write state. SQLite can't
  // change a CHECK constraint, so sessions is rebuilt with every row kept.
  `
  CREATE TABLE sessions_v2 (
    id TEXT PRIMARY KEY NOT NULL,
    started_at INTEGER NOT NULL,
    active_ms INTEGER NOT NULL CHECK (active_ms >= 0),
    practice_kind TEXT NOT NULL CHECK (practice_kind IN ('technique', 'rhythm', 'custom', 'routine')),
    practice_ref TEXT,
    technique_id TEXT,
    name TEXT NOT NULL,
    steps TEXT NOT NULL,
    target_kind TEXT NOT NULL CHECK (target_kind IN ('minutes', 'rounds')),
    target_value INTEGER NOT NULL,
    completed_rounds INTEGER NOT NULL CHECK (completed_rounds >= 0),
    breaths_per_minute REAL NOT NULL,
    outcome TEXT NOT NULL CHECK (outcome IN ('completed', 'ended')),
    cue_mode TEXT NOT NULL,
    haptics INTEGER NOT NULL,
    parts TEXT,
    program TEXT,
    health_state TEXT NOT NULL DEFAULT 'none'
      CHECK (health_state IN ('none', 'pending', 'written', 'unavailable', 'declined', 'failed'))
  );
  INSERT INTO sessions_v2 (id, started_at, active_ms, practice_kind, practice_ref, technique_id, name, steps, target_kind, target_value, completed_rounds, breaths_per_minute, outcome, cue_mode, haptics)
    SELECT id, started_at, active_ms, practice_kind, practice_ref, technique_id, name, steps, target_kind, target_value, completed_rounds, breaths_per_minute, outcome, cue_mode, haptics FROM sessions;
  DROP TABLE sessions;
  ALTER TABLE sessions_v2 RENAME TO sessions;
  CREATE INDEX sessions_started_at ON sessions (started_at DESC);
  CREATE INDEX sessions_health_state ON sessions (health_state);

  CREATE TABLE routines (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    segments TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE enrollments (
    id TEXT PRIMARY KEY NOT NULL,
    program_id TEXT NOT NULL,
    content_version INTEGER NOT NULL,
    definition TEXT NOT NULL,
    state TEXT NOT NULL CHECK (state IN ('active', 'left', 'completed')),
    completed_sessions INTEGER NOT NULL DEFAULT 0 CHECK (completed_sessions >= 0),
    plan TEXT,
    started_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    last_session_at INTEGER
  );
  `,
  // 3 · v1.1: gradual slowing on records and saved rhythms (FR-24).
  `
  ALTER TABLE sessions ADD COLUMN slowing TEXT;
  ALTER TABLE rhythms ADD COLUMN slowing TEXT;
  `,
];

export class MigrationError extends Error {
  constructor(
    readonly fromVersion: number,
    cause: unknown,
  ) {
    super(`Migration from schema ${fromVersion} failed: ${cause instanceof Error ? cause.message : String(cause)}`);
  }
}

export function schemaVersion(db: Db): number {
  return db.getFirstSync<{ user_version: number }>('PRAGMA user_version', [])?.user_version ?? 0;
}

/** Brings the schema up to date. A newer schema than this app knows is left alone. */
export function migrate(db: Db, migrations: readonly string[] = MIGRATIONS): void {
  let version = schemaVersion(db);
  while (version < migrations.length) {
    const from = version;
    try {
      db.withTransactionSync(() => {
        db.execSync(migrations[from]);
        db.execSync(`PRAGMA user_version = ${from + 1}`);
      });
    } catch (error) {
      throw new MigrationError(from, error);
    }
    version = from + 1;
  }
}

export function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
