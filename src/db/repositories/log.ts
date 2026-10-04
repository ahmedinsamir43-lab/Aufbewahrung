import type { FoodSource, LogEntry, Meal } from '@/domain/types';

import type { Db } from '../database';

interface LogRow {
  id: number;
  date: string;
  meal: Meal;
  food_id: number | null;
  name: string;
  amount_g: number;
  kcal: number;
  carbs_g: number;
  protein_g: number;
  fat_g: number;
  source: FoodSource;
  is_estimate: number;
  confidence: number | null;
  created_at: string;
}

function toEntry(r: LogRow): LogEntry {
  return {
    id: r.id,
    date: r.date,
    meal: r.meal,
    foodId: r.food_id,
    name: r.name,
    amountG: r.amount_g,
    kcal: r.kcal,
    carbsG: r.carbs_g,
    proteinG: r.protein_g,
    fatG: r.fat_g,
    source: r.source,
    isEstimate: r.is_estimate === 1,
    confidence: r.confidence,
    createdAt: r.created_at,
  };
}

export type NewLogEntry = Omit<LogEntry, 'id' | 'createdAt'>;

export async function addLogEntry(db: Db, e: NewLogEntry, now: string): Promise<number> {
  const r = await db.runAsync(
    `INSERT INTO log_entry (date, meal, food_id, name, amount_g, kcal, carbs_g, protein_g, fat_g,
       source, is_estimate, confidence, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    e.date,
    e.meal,
    e.foodId,
    e.name,
    e.amountG,
    e.kcal,
    e.carbsG,
    e.proteinG,
    e.fatG,
    e.source,
    e.isEstimate ? 1 : 0,
    e.confidence,
    now,
  );
  return r.lastInsertRowId;
}

/** Ändert Menge, Mahlzeit und die daraus berechneten Nährwerte eines Eintrags. */
export async function updateLogEntry(
  db: Db,
  id: number,
  patch: Pick<LogEntry, 'meal' | 'amountG' | 'kcal' | 'carbsG' | 'proteinG' | 'fatG'>,
): Promise<void> {
  await db.runAsync(
    `UPDATE log_entry SET meal = ?, amount_g = ?, kcal = ?, carbs_g = ?, protein_g = ?, fat_g = ?
     WHERE id = ?`,
    patch.meal,
    patch.amountG,
    patch.kcal,
    patch.carbsG,
    patch.proteinG,
    patch.fatG,
    id,
  );
}

export async function deleteLogEntry(db: Db, id: number): Promise<void> {
  await db.runAsync('DELETE FROM log_entry WHERE id = ?', id);
}

export async function getLogEntry(db: Db, id: number): Promise<LogEntry | null> {
  const row = await db.getFirstAsync<LogRow>('SELECT * FROM log_entry WHERE id = ?', id);
  return row ? toEntry(row) : null;
}

const MEAL_ORDER = `CASE meal WHEN 'breakfast' THEN 0 WHEN 'lunch' THEN 1 WHEN 'dinner' THEN 2 ELSE 3 END`;

export async function getEntriesForDate(db: Db, date: string): Promise<LogEntry[]> {
  const rows = await db.getAllAsync<LogRow>(
    `SELECT * FROM log_entry WHERE date = ? ORDER BY ${MEAL_ORDER}, created_at, id`,
    date,
  );
  return rows.map(toEntry);
}
