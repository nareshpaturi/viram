/**
 * Opens the database once and hands out the repositories. Screens use these
 * repositories only; they never issue SQL.
 */
import { openDatabaseSync } from 'expo-sqlite';
import { DATABASE_NAME, migrate } from './db';
import { createStores, type Stores } from './stores';

export type { Stores };

let opened: Stores | null = null;

/**
 * Throws MigrationError when the schema can't be brought up to date; the
 * caller shows a recoverable error and the data stays as it was.
 */
export function stores(): Stores {
  if (opened) return opened;
  const db = openDatabaseSync(DATABASE_NAME);
  db.execSync('PRAGMA journal_mode = WAL');
  migrate(db);
  opened = createStores(db);
  return opened;
}
