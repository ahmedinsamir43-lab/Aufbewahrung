import type { SQLiteDatabase } from 'expo-sqlite';

import { migrate } from './schema';

export const DATABASE_NAME = 'naehrwert.db';

/** Wird von `SQLiteProvider` beim Öffnen der Datenbank aufgerufen. */
export async function initDatabase(db: SQLiteDatabase): Promise<void> {
  await migrate(db);
}
