import type { Db } from '@/db/database';
import { getFoodByBarcode, upsertOffFood } from '@/db/repositories/food';
import {
  listOpenScans,
  markScanNotFound,
  markScanResolved,
  recordScanAttempt,
} from '@/db/repositories/pending-scan';

import { lookupBarcode, OffNetworkError, type LookupResult } from './open-food-facts';

export type Lookup = (barcode: string) => Promise<LookupResult>;

export type BarcodeResolution =
  | { kind: 'found'; foodId: number; fromCache: boolean }
  | { kind: 'incomplete'; name: string | null; brand: string | null }
  | { kind: 'not_found' }
  | { kind: 'offline' };

/**
 * Löst einen Barcode auf:
 * 1. lokaler Katalog (funktioniert offline, auch für selbst angelegte Produkte),
 * 2. Open Food Facts → Produkt wird lokal gespeichert,
 * 3. ohne Verbindung → `offline` (der Aufrufer legt den Scan in die Warteschlange).
 */
export async function resolveBarcode(
  db: Db,
  barcode: string,
  lookup: Lookup = (b) => lookupBarcode(b),
  now: Date = new Date(),
): Promise<BarcodeResolution> {
  const local = await getFoodByBarcode(db, barcode);
  if (local) return { kind: 'found', foodId: local.id, fromCache: true };
  try {
    const result = await lookup(barcode);
    if (result.kind === 'complete') {
      const foodId = await upsertOffFood(db, result.product, now.toISOString());
      return { kind: 'found', foodId, fromCache: false };
    }
    if (result.kind === 'incomplete') return { kind: 'incomplete', name: result.name, brand: result.brand };
    return { kind: 'not_found' };
  } catch (error) {
    if (error instanceof OffNetworkError) return { kind: 'offline' };
    throw error;
  }
}

/**
 * Arbeitet die Offline-Warteschlange ab. Bricht beim ersten Netzwerkfehler ab, weil weitere
 * Versuche dann ebenfalls scheitern würden.
 */
export async function processPendingScans(
  db: Db,
  lookup: Lookup = (b) => lookupBarcode(b),
  now: Date = new Date(),
): Promise<{ resolved: number; notFound: number; offline: boolean }> {
  const result = { resolved: 0, notFound: 0, offline: false };
  for (const scan of await listOpenScans(db)) {
    if (scan.status !== 'pending') continue;
    const r = await resolveBarcode(db, scan.barcode, lookup, now);
    if (r.kind === 'found') {
      await markScanResolved(db, scan.id, r.foodId);
      result.resolved++;
    } else if (r.kind === 'offline') {
      await recordScanAttempt(db, scan.id, 'Keine Verbindung');
      result.offline = true;
      break;
    } else {
      await markScanNotFound(db, scan.id);
      result.notFound++;
    }
  }
  return result;
}
