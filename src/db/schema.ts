/**
 * SQLite-Schema als geordnete Migrationsliste. Der aktuelle Stand wird über
 * `PRAGMA user_version` verfolgt: Beim App-Start werden nur die noch fehlenden
 * Migrationen in einer Transaktion ausgeführt. Bestehende Migrationen werden nie
 * nachträglich geändert, sondern stets durch neue ergänzt.
 */
export const MIGRATIONS: readonly string[] = [
  // v1 – Ausgangsschema
  `
  CREATE TABLE profile (
    id                INTEGER PRIMARY KEY CHECK (id = 1),
    first_name        TEXT    NOT NULL,
    age_years         INTEGER NOT NULL CHECK (age_years BETWEEN 14 AND 100),
    sex               TEXT    NOT NULL CHECK (sex IN ('male', 'female')),
    height_cm         REAL    NOT NULL CHECK (height_cm BETWEEN 100 AND 250),
    weight_kg         REAL    NOT NULL CHECK (weight_kg BETWEEN 30 AND 350),
    goal              TEXT    NOT NULL CHECK (goal IN ('lose', 'maintain', 'gain')),
    target_weight_kg  REAL,
    activity_level    TEXT    NOT NULL
                      CHECK (activity_level IN ('sedentary', 'light', 'moderate', 'very', 'athlete')),
    pace              TEXT    CHECK (pace IN ('gentle', 'steady', 'aggressive')),
    diet_style        TEXT    NOT NULL
                      CHECK (diet_style IN ('none', 'high_protein', 'low_carb', 'keto', 'vegetarian', 'vegan')),
    avoid_foods       TEXT    NOT NULL DEFAULT '[]',  -- JSON-Array von Schlagwörtern
    health_note       TEXT,
    updated_at        TEXT    NOT NULL
  );

  CREATE TABLE nutrition_plan (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    valid_from            TEXT    NOT NULL,  -- YYYY-MM-DD
    bmr                   INTEGER NOT NULL,
    tdee                  INTEGER NOT NULL,
    kcal_target           INTEGER NOT NULL,
    carbs_g               INTEGER NOT NULL,
    protein_g             INTEGER NOT NULL,
    fat_g                 INTEGER NOT NULL,
    carbs_pct             INTEGER NOT NULL,
    protein_pct           INTEGER NOT NULL,
    fat_pct               INTEGER NOT NULL,
    floor_applied         INTEGER NOT NULL DEFAULT 0,
    protein_reference_kg  REAL    NOT NULL,
    est_weeks_to_target   INTEGER,
    created_at            TEXT    NOT NULL
  );
  CREATE INDEX idx_plan_valid_from ON nutrition_plan (valid_from);

  CREATE TABLE food (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    source             TEXT    NOT NULL CHECK (source IN ('openfoodfacts', 'manual', 'photo')),
    barcode            TEXT    UNIQUE,
    name               TEXT    NOT NULL,
    brand              TEXT,
    kcal_100g          REAL    NOT NULL CHECK (kcal_100g >= 0),
    carbs_100g         REAL    NOT NULL CHECK (carbs_100g >= 0),
    protein_100g       REAL    NOT NULL CHECK (protein_100g >= 0),
    fat_100g           REAL    NOT NULL CHECK (fat_100g >= 0),
    default_portion_g  REAL,
    ingredients_text   TEXT,
    is_favorite        INTEGER NOT NULL DEFAULT 0,
    last_used_at       TEXT,
    created_at         TEXT    NOT NULL,
    updated_at         TEXT    NOT NULL
  );
  CREATE INDEX idx_food_name ON food (name COLLATE NOCASE);
  CREATE INDEX idx_food_recent ON food (is_favorite DESC, last_used_at DESC);

  CREATE TABLE log_entry (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    date        TEXT    NOT NULL,  -- YYYY-MM-DD (lokale Zeit)
    meal        TEXT    NOT NULL CHECK (meal IN ('breakfast', 'lunch', 'dinner', 'snack')),
    food_id     INTEGER REFERENCES food (id) ON DELETE SET NULL,
    name        TEXT    NOT NULL,
    amount_g    REAL    NOT NULL CHECK (amount_g > 0),
    kcal        REAL    NOT NULL,
    carbs_g     REAL    NOT NULL,
    protein_g   REAL    NOT NULL,
    fat_g       REAL    NOT NULL,
    source      TEXT    NOT NULL CHECK (source IN ('openfoodfacts', 'manual', 'photo')),
    is_estimate INTEGER NOT NULL DEFAULT 0,
    confidence  REAL    CHECK (confidence IS NULL OR confidence BETWEEN 0 AND 1),
    created_at  TEXT    NOT NULL
  );
  CREATE INDEX idx_log_date ON log_entry (date, meal);

  CREATE TABLE pending_scan (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    barcode     TEXT    NOT NULL,
    date        TEXT    NOT NULL,
    meal        TEXT    NOT NULL CHECK (meal IN ('breakfast', 'lunch', 'dinner', 'snack')),
    status      TEXT    NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'resolved', 'not_found')),
    attempts    INTEGER NOT NULL DEFAULT 0,
    last_error  TEXT,
    created_at  TEXT    NOT NULL
  );
  CREATE INDEX idx_pending_status ON pending_scan (status);

  CREATE TABLE app_setting (
    key    TEXT PRIMARY KEY,
    value  TEXT NOT NULL
  );
  `,
];

export const SCHEMA_VERSION = MIGRATIONS.length;

/**
 * Minimale Datenbankschnittstelle, die sowohl `expo-sqlite` (App) als auch
 * `node:sqlite` (Unit-Tests) erfüllen.
 */
export interface MigratableDatabase {
  execAsync(source: string): Promise<void>;
  getFirstAsync<T>(source: string): Promise<T | null>;
}

/** Führt alle ausstehenden Migrationen aus und gibt die erreichte Schemaversion zurück. */
export async function migrate(db: MigratableDatabase): Promise<number> {
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = row?.user_version ?? 0;

  if (version > SCHEMA_VERSION) {
    throw new Error(
      `Datenbankversion ${version} ist neuer als die App (${SCHEMA_VERSION}). Bitte App aktualisieren.`,
    );
  }

  while (version < SCHEMA_VERSION) {
    const next = version + 1;
    await db.execAsync('BEGIN');
    try {
      await db.execAsync(`${MIGRATIONS[version]}\nPRAGMA user_version = ${next};`);
      await db.execAsync('COMMIT');
    } catch (error) {
      await db.execAsync('ROLLBACK');
      throw error;
    }
    version = next;
  }
  return version;
}
