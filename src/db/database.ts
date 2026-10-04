/**
 * Schmale Datenbankschnittstelle, die von `expo-sqlite` (App) und einem `node:sqlite`-Adapter
 * (Tests) erfüllt wird. Repositories hängen nur von dieser Schnittstelle ab.
 */
export type BindValue = string | number | null;

export interface Db {
  execAsync(source: string): Promise<void>;
  runAsync(source: string, ...params: BindValue[]): Promise<{ lastInsertRowId: number; changes: number }>;
  getFirstAsync<T>(source: string, ...params: BindValue[]): Promise<T | null>;
  getAllAsync<T>(source: string, ...params: BindValue[]): Promise<T[]>;
}

/** Führt `task` atomar aus; bei einem Fehler wird die Transaktion zurückgerollt. */
export async function inTransaction<T>(db: Db, task: () => Promise<T>): Promise<T> {
  await db.execAsync('BEGIN');
  try {
    const result = await task();
    await db.execAsync('COMMIT');
    return result;
  } catch (error) {
    await db.execAsync('ROLLBACK');
    throw error;
  }
}
