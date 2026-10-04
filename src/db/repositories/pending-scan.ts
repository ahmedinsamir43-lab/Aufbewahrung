import type { Meal, PendingScan, PendingScanStatus } from '@/domain/types';

import type { Db } from '../database';

interface PendingRow {
  id: number;
  barcode: string;
  date: string;
  meal: Meal;
  status: PendingScanStatus;
  attempts: number;
  last_error: string | null;
  food_id: number | null;
  food_name: string | null;
  created_at: string;
}

function toScan(r: PendingRow): PendingScan {
  return {
    id: r.id,
    barcode: r.barcode,
    date: r.date,
    meal: r.meal,
    status: r.status,
    attempts: r.attempts,
    lastError: r.last_error,
    foodId: r.food_id,
    foodName: r.food_name,
    createdAt: r.created_at,
  };
}

const SELECT = `SELECT s.*, f.name AS food_name FROM pending_scan s LEFT JOIN food f ON f.id = s.food_id`;

/** Speichert einen Scan zur späteren Abfrage. Ein bereits wartender Barcode wird nicht doppelt angelegt. */
export async function queueScan(db: Db, scan: { barcode: string; date: string; meal: Meal }, now: string): Promise<void> {
  await db.runAsync(
    `INSERT OR IGNORE INTO pending_scan (barcode, date, meal, status, created_at) VALUES (?, ?, ?, 'pending', ?)`,
    scan.barcode,
    scan.date,
    scan.meal,
    now,
  );
}

/** Alle noch nicht erledigten Scans, älteste zuerst. */
export async function listOpenScans(db: Db): Promise<PendingScan[]> {
  const rows = await db.getAllAsync<PendingRow>(`${SELECT} ORDER BY s.created_at, s.id`);
  return rows.map(toScan);
}

export async function getScan(db: Db, id: number): Promise<PendingScan | null> {
  const row = await db.getFirstAsync<PendingRow>(`${SELECT} WHERE s.id = ?`, id);
  return row ? toScan(row) : null;
}

export async function markScanResolved(db: Db, id: number, foodId: number): Promise<void> {
  await db.runAsync(`UPDATE pending_scan SET status = 'resolved', food_id = ?, last_error = NULL WHERE id = ?`, foodId, id);
}

export async function markScanNotFound(db: Db, id: number): Promise<void> {
  await db.runAsync(`UPDATE pending_scan SET status = 'not_found', last_error = NULL WHERE id = ?`, id);
}

export async function recordScanAttempt(db: Db, id: number, error: string): Promise<void> {
  await db.runAsync('UPDATE pending_scan SET attempts = attempts + 1, last_error = ? WHERE id = ?', error, id);
}

/** Erledigt: Scan wurde protokolliert, manuell angelegt oder verworfen. */
export async function deleteScan(db: Db, id: number): Promise<void> {
  await db.runAsync('DELETE FROM pending_scan WHERE id = ?', id);
}
