import { historyRepository } from '../history/repository';
import { rhythmsRepository } from '../rhythms/repository';
import { preferencesRepository } from '../settings/preferences';
import type { Db } from './db';

export function createStores(db: Db) {
  return {
    history: historyRepository(db),
    rhythms: rhythmsRepository(db),
    preferences: preferencesRepository(db),
    transaction: (task: () => void) => db.withTransactionSync(task),
  };
}

export type Stores = ReturnType<typeof createStores>;
