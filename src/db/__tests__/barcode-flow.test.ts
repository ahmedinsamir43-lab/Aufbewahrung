/**
 * @jest-environment node
 */
import { processPendingScans, resolveBarcode, type Lookup } from '@/services/barcode-service';
import { OffNetworkError, type MappedProduct } from '@/services/open-food-facts';

import { getFood, getFoodByBarcode, insertFood, upsertOffFood } from '../repositories/food';
import { deleteScan, listOpenScans, queueScan } from '../repositories/pending-scan';
import { createMigratedDb } from '../testing/node-sqlite';

const NOW = '2026-10-04T08:00:00.000Z';

const skyr: MappedProduct = {
  barcode: '4000000000001',
  name: 'Skyr Natur',
  brand: 'Arla',
  per100g: { kcal: 63, carbsG: 4, proteinG: 11, fatG: 0.2 },
  defaultPortionG: 150,
  ingredientsText: 'Magermilch | Allergene/Spuren: Milch, Laktose',
};

const found: Lookup = async (b) => ({ kind: 'complete', product: { ...skyr, barcode: b } });
const offline: Lookup = async () => {
  throw new OffNetworkError('Network request failed');
};
const notFound: Lookup = async (b) => ({ kind: 'not_found', barcode: b });

describe('Katalog: Barcode', () => {
  it('legt OFF-Produkte an und aktualisiert sie', async () => {
    const db = await createMigratedDb();
    const id = await upsertOffFood(db, skyr, NOW);
    const again = await upsertOffFood(db, { ...skyr, per100g: { ...skyr.per100g, kcal: 65 } }, NOW);
    expect(again).toBe(id);
    expect((await getFood(db, id))?.per100g.kcal).toBe(65);
  });

  it('überschreibt selbst angelegte Lebensmittel nicht', async () => {
    const db = await createMigratedDb();
    const id = await insertFood(
      db,
      { source: 'manual', barcode: skyr.barcode, name: 'Mein Skyr', per100g: { kcal: 60, carbsG: 4, proteinG: 10, fatG: 0 } },
      NOW,
    );
    expect(await upsertOffFood(db, skyr, NOW)).toBe(id);
    expect((await getFood(db, id))?.name).toBe('Mein Skyr');
  });
});

describe('resolveBarcode', () => {
  it('nutzt zuerst den lokalen Katalog (offline-fähig)', async () => {
    const db = await createMigratedDb();
    await upsertOffFood(db, skyr, NOW);
    await expect(resolveBarcode(db, skyr.barcode, offline)).resolves.toMatchObject({ kind: 'found', fromCache: true });
  });

  it('speichert gefundene Produkte lokal', async () => {
    const db = await createMigratedDb();
    const r = await resolveBarcode(db, '4000000000002', found);
    expect(r).toMatchObject({ kind: 'found', fromCache: false });
    expect(await getFoodByBarcode(db, '4000000000002')).not.toBeNull();
  });

  it('meldet offline, nicht gefunden und unvollständig', async () => {
    const db = await createMigratedDb();
    await expect(resolveBarcode(db, '1', offline)).resolves.toEqual({ kind: 'offline' });
    await expect(resolveBarcode(db, '1', notFound)).resolves.toEqual({ kind: 'not_found' });
    await expect(
      resolveBarcode(db, '1', async (b) => ({ kind: 'incomplete', barcode: b, name: 'Cola', brand: null })),
    ).resolves.toEqual({ kind: 'incomplete', name: 'Cola', brand: null });
  });

  it('reicht unerwartete Fehler weiter', async () => {
    const db = await createMigratedDb();
    await expect(
      resolveBarcode(db, '1', async () => {
        throw new Error('Programmfehler');
      }),
    ).rejects.toThrow('Programmfehler');
  });
});

describe('Offline-Warteschlange', () => {
  it('legt einen wartenden Barcode nur einmal an', async () => {
    const db = await createMigratedDb();
    await queueScan(db, { barcode: '1', date: '2026-10-04', meal: 'lunch' }, NOW);
    await queueScan(db, { barcode: '1', date: '2026-10-04', meal: 'lunch' }, NOW);
    expect(await listOpenScans(db)).toHaveLength(1);
  });

  it('löst wartende Scans auf, sobald wieder Verbindung besteht', async () => {
    const db = await createMigratedDb();
    await queueScan(db, { barcode: '4000000000003', date: '2026-10-04', meal: 'lunch' }, NOW);
    await queueScan(db, { barcode: '4000000000004', date: '2026-10-04', meal: 'snack' }, NOW);

    expect(await processPendingScans(db, offline)).toEqual({ resolved: 0, notFound: 0, offline: true });
    let scans = await listOpenScans(db);
    expect(scans[0]).toMatchObject({ status: 'pending', attempts: 1, lastError: 'Keine Verbindung' });
    expect(scans[1].attempts).toBe(0); // Abbruch nach erstem Netzwerkfehler

    const lookup: Lookup = async (b) => (b.endsWith('3') ? found(b) : notFound(b));
    expect(await processPendingScans(db, lookup)).toEqual({ resolved: 1, notFound: 1, offline: false });
    scans = await listOpenScans(db);
    expect(scans.map((s) => [s.status, s.foodName])).toEqual([
      ['resolved', 'Skyr Natur'],
      ['not_found', null],
    ]);
  });

  it('erlaubt einen neuen Scan desselben Barcodes nach Erledigung', async () => {
    const db = await createMigratedDb();
    await queueScan(db, { barcode: '1', date: '2026-10-04', meal: 'lunch' }, NOW);
    const [scan] = await listOpenScans(db);
    await deleteScan(db, scan.id);
    await queueScan(db, { barcode: '1', date: '2026-10-05', meal: 'dinner' }, NOW);
    expect((await listOpenScans(db)).map((s) => s.date)).toEqual(['2026-10-05']);
  });
});
