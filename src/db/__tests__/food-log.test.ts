/**
 * @jest-environment node
 */
import { changeEntryPortion, logFood } from '@/services/log-service';

import { getFood, insertFood, recentFoods, searchFoods, setFavorite } from '../repositories/food';
import { deleteLogEntry, getEntriesForDate, getLogEntry } from '../repositories/log';
import { createMigratedDb, type TestDb } from '../testing/node-sqlite';

const NOW = '2026-10-04T08:00:00.000Z';

async function seed(db: TestDb) {
  const oats = await insertFood(
    db,
    { source: 'manual', name: 'Haferflocken', brand: 'Kölln', per100g: { kcal: 372, carbsG: 58.7, proteinG: 13.5, fatG: 7 }, defaultPortionG: 60 },
    NOW,
  );
  const apple = await insertFood(
    db,
    { source: 'manual', name: 'Apfel', per100g: { kcal: 52, carbsG: 14, proteinG: 0.3, fatG: 0.2 } },
    NOW,
  );
  const pb = await insertFood(
    db,
    { source: 'openfoodfacts', barcode: '123', name: 'Erdnussbutter 100%', per100g: { kcal: 610, carbsG: 12, proteinG: 25, fatG: 50 } },
    NOW,
  );
  return { oats, apple, pb };
}

describe('Lebensmittelkatalog', () => {
  it('speichert und lädt ein Lebensmittel', async () => {
    const db = await createMigratedDb();
    const { oats } = await seed(db);
    expect(await getFood(db, oats)).toMatchObject({
      name: 'Haferflocken',
      brand: 'Kölln',
      per100g: { kcal: 372, carbsG: 58.7 },
      defaultPortionG: 60,
      isFavorite: false,
    });
  });

  it('sucht nach Name und Marke, Wortanfang zuerst', async () => {
    const db = await createMigratedDb();
    await seed(db);
    expect((await searchFoods(db, 'apf')).map((f) => f.name)).toEqual(['Apfel']);
    expect((await searchFoods(db, 'kölln')).map((f) => f.name)).toEqual(['Haferflocken']);
    expect(await searchFoods(db, '   ')).toEqual([]);
  });

  it('behandelt LIKE-Sonderzeichen wörtlich', async () => {
    const db = await createMigratedDb();
    await seed(db);
    expect((await searchFoods(db, '100%')).map((f) => f.name)).toEqual(['Erdnussbutter 100%']);
    expect(await searchFoods(db, '%')).toHaveLength(1);
    expect(await searchFoods(db, '_')).toHaveLength(0);
  });

  it('listet Favoriten vor zuletzt verwendeten Lebensmitteln', async () => {
    const db = await createMigratedDb();
    const { oats, apple } = await seed(db);
    expect(await recentFoods(db)).toEqual([]);
    await logFood(db, { foodId: oats, amountG: 60, meal: 'breakfast', date: '2026-10-04' });
    await setFavorite(db, apple, true, NOW);
    expect((await recentFoods(db)).map((f) => f.name)).toEqual(['Apfel', 'Haferflocken']);
  });
});

describe('Tagesprotokoll', () => {
  it('trägt eine Portion mit umgerechneten Nährwerten ein', async () => {
    const db = await createMigratedDb();
    const { oats } = await seed(db);
    const id = await logFood(db, { foodId: oats, amountG: 60, meal: 'breakfast', date: '2026-10-04' });
    const entry = await getLogEntry(db, id);
    expect(entry).toMatchObject({ name: 'Haferflocken (Kölln)', amountG: 60, meal: 'breakfast', foodId: oats });
    expect(entry!.kcal).toBeCloseTo(223.2);
    expect(entry!.proteinG).toBeCloseTo(8.1);
  });

  it('sortiert Einträge nach Mahlzeit und filtert nach Datum', async () => {
    const db = await createMigratedDb();
    const { oats, apple } = await seed(db);
    await logFood(db, { foodId: apple, amountG: 150, meal: 'snack', date: '2026-10-04' });
    await logFood(db, { foodId: oats, amountG: 60, meal: 'breakfast', date: '2026-10-04' });
    await logFood(db, { foodId: apple, amountG: 100, meal: 'lunch', date: '2026-10-03' });
    const entries = await getEntriesForDate(db, '2026-10-04');
    expect(entries.map((e) => e.meal)).toEqual(['breakfast', 'snack']);
  });

  it('ändert die Portion proportional und verschiebt die Mahlzeit', async () => {
    const db = await createMigratedDb();
    const { oats } = await seed(db);
    const id = await logFood(db, { foodId: oats, amountG: 60, meal: 'breakfast', date: '2026-10-04' });
    await changeEntryPortion(db, (await getLogEntry(db, id))!, 90, 'snack');
    const e = await getLogEntry(db, id);
    expect(e).toMatchObject({ amountG: 90, meal: 'snack' });
    expect(e!.kcal).toBeCloseTo(334.8);
  });

  it('löscht Einträge', async () => {
    const db = await createMigratedDb();
    const { apple } = await seed(db);
    const id = await logFood(db, { foodId: apple, amountG: 100, meal: 'snack', date: '2026-10-04' });
    await deleteLogEntry(db, id);
    expect(await getEntriesForDate(db, '2026-10-04')).toEqual([]);
  });

  it('wirft bei unbekanntem Lebensmittel', async () => {
    const db = await createMigratedDb();
    await expect(logFood(db, { foodId: 999, amountG: 100, meal: 'snack', date: '2026-10-04' })).rejects.toThrow();
  });
});
