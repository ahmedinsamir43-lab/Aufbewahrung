/**
 * Nur für Tests: Adapter von `node:sqlite` auf die `Db`-Schnittstelle (In-Memory-Datenbank).
 */
import { DatabaseSync } from 'node:sqlite';

import type { BindValue, Db } from '../database';
import { migrate } from '../schema';

export type TestDb = Db & { raw: DatabaseSync };

export function createNodeDb(): TestDb {
  const raw = new DatabaseSync(':memory:');
  return {
    raw,
    execAsync: async (source) => {
      raw.exec(source);
    },
    runAsync: async (source, ...params: BindValue[]) => {
      const r = raw.prepare(source).run(...params);
      return { lastInsertRowId: Number(r.lastInsertRowid), changes: Number(r.changes) };
    },
    getFirstAsync: async <T,>(source: string, ...params: BindValue[]) =>
      ((raw.prepare(source).get(...params) as T | undefined) ?? null),
    getAllAsync: async <T,>(source: string, ...params: BindValue[]) =>
      raw.prepare(source).all(...params) as T[],
  };
}

export async function createMigratedDb(): Promise<TestDb> {
  const db = createNodeDb();
  await migrate(db);
  return db;
}
