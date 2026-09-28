/// <reference types="node" />
import { DatabaseSync } from 'node:sqlite';
import type { Db } from '../db';

/** Node's built-in SQLite behind the same synchronous API the app uses. */
export function memoryDb(path = ':memory:'): Db & { close(): void } {
  const db = new DatabaseSync(path);
  return {
    execSync: (source) => db.exec(source),
    runSync: (source, params) => db.prepare(source).run(...params),
    getAllSync: <T,>(source: string, params: (string | number | null)[]) => db.prepare(source).all(...params) as T[],
    getFirstSync: <T,>(source: string, params: (string | number | null)[]) => (db.prepare(source).get(...params) as T) ?? null,
    withTransactionSync: (task) => {
      db.exec('BEGIN');
      try {
        task();
        db.exec('COMMIT');
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    },
    close: () => db.close(),
  };
}
