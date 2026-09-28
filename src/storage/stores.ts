import { historyRepository } from '../history/repository';
import { programsRepository } from '../programs/repository';
import { rhythmsRepository } from '../rhythms/repository';
import { routinesRepository } from '../routines/repository';
import { preferencesRepository } from '../settings/preferences';
import type { Db } from './db';

export function createStores(db: Db) {
  return {
    history: historyRepository(db),
    rhythms: rhythmsRepository(db),
    routines: routinesRepository(db),
    programs: programsRepository(db),
    preferences: preferencesRepository(db),
    transaction: (task: () => void) => db.withTransactionSync(task),
  };
}

export type Stores = ReturnType<typeof createStores>;
