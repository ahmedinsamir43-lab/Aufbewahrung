/**
 * @jest-environment node
 *
 * Führt die Migrationen gegen eine echte SQLite-In-Memory-Datenbank (`node:sqlite`) aus.
 */
import { migrate, SCHEMA_VERSION } from '../schema';
import { createNodeDb as createTestDb } from '../testing/node-sqlite';

const NOW = '2026-10-04T12:00:00.000Z';

describe('Datenbankschema', () => {
  it('migriert eine leere Datenbank auf die aktuelle Version', async () => {
    const db = createTestDb();
    await expect(migrate(db)).resolves.toBe(SCHEMA_VERSION);

    const tables = db.raw
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
      .all()
      .map((r) => (r as unknown as { name: string }).name);
    expect(tables).toEqual([
      'app_setting',
      'food',
      'log_entry',
      'nutrition_plan',
      'pending_scan',
      'profile',
    ]);
  });

  it('ist idempotent', async () => {
    const db = createTestDb();
    await migrate(db);
    await expect(migrate(db)).resolves.toBe(SCHEMA_VERSION);
  });

  it('erlaubt genau ein Profil', async () => {
    const db = createTestDb();
    await migrate(db);
    const insert = db.raw.prepare(
      `INSERT INTO profile (id, first_name, age_years, sex, height_cm, weight_kg, goal,
         activity_level, diet_style, updated_at)
       VALUES (?, 'Test', 30, 'female', 170, 65, 'maintain', 'light', 'none', ?)`,
    );
    insert.run(1, NOW);
    expect(() => insert.run(2, NOW)).toThrow();
  });

  it('weist ungültige Werte per CHECK-Constraint ab', async () => {
    const db = createTestDb();
    await migrate(db);
    expect(() =>
      db.raw
        .prepare(
          `INSERT INTO log_entry (date, meal, name, amount_g, kcal, carbs_g, protein_g, fat_g,
             source, created_at)
           VALUES ('2026-10-04', 'brunch', 'X', 100, 1, 1, 1, 1, 'manual', ?)`,
        )
        .run(NOW),
    ).toThrow(/CHECK/);
  });

  it('erzwingt eindeutige Barcodes im Lebensmittelkatalog', async () => {
    const db = createTestDb();
    await migrate(db);
    const insert = db.raw.prepare(
      `INSERT INTO food (source, barcode, name, kcal_100g, carbs_100g, protein_100g, fat_100g,
         created_at, updated_at)
       VALUES ('openfoodfacts', '4000417025005', 'Haferflocken', 372, 58.7, 13.5, 7, ?, ?)`,
    );
    insert.run(NOW, NOW);
    expect(() => insert.run(NOW, NOW)).toThrow(/UNIQUE/);
  });

  it('setzt food_id beim Löschen eines Lebensmittels auf NULL (Historie bleibt erhalten)', async () => {
    const db = createTestDb();
    await migrate(db);
    db.raw
      .prepare(
        `INSERT INTO food (id, source, name, kcal_100g, carbs_100g, protein_100g, fat_100g,
           created_at, updated_at)
         VALUES (1, 'manual', 'Apfel', 52, 14, 0.3, 0.2, ?, ?)`,
      )
      .run(NOW, NOW);
    db.raw
      .prepare(
        `INSERT INTO log_entry (date, meal, food_id, name, amount_g, kcal, carbs_g, protein_g,
           fat_g, source, created_at)
         VALUES ('2026-10-04', 'snack', 1, 'Apfel', 150, 78, 21, 0.45, 0.3, 'manual', ?)`,
      )
      .run(NOW);
    db.raw.exec('DELETE FROM food WHERE id = 1');
    const entry = db.raw.prepare('SELECT food_id, name, kcal FROM log_entry').get();
    expect(entry).toEqual({ food_id: null, name: 'Apfel', kcal: 78 });
  });
});
