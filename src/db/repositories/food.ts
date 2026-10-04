import type { Food, FoodSource, Per100g } from '@/domain/types';

import type { Db } from '../database';

interface FoodRow {
  id: number;
  source: FoodSource;
  barcode: string | null;
  name: string;
  brand: string | null;
  kcal_100g: number;
  carbs_100g: number;
  protein_100g: number;
  fat_100g: number;
  default_portion_g: number | null;
  ingredients_text: string | null;
  is_favorite: number;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}

function toFood(r: FoodRow): Food {
  return {
    id: r.id,
    source: r.source,
    barcode: r.barcode,
    name: r.name,
    brand: r.brand,
    per100g: { kcal: r.kcal_100g, carbsG: r.carbs_100g, proteinG: r.protein_100g, fatG: r.fat_100g },
    defaultPortionG: r.default_portion_g,
    ingredientsText: r.ingredients_text,
    isFavorite: r.is_favorite === 1,
    lastUsedAt: r.last_used_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export interface NewFood {
  source: FoodSource;
  barcode?: string | null;
  name: string;
  brand?: string | null;
  per100g: Per100g;
  defaultPortionG?: number | null;
  ingredientsText?: string | null;
}

export async function insertFood(db: Db, food: NewFood, now: string): Promise<number> {
  const r = await db.runAsync(
    `INSERT INTO food (source, barcode, name, brand, kcal_100g, carbs_100g, protein_100g, fat_100g,
       default_portion_g, ingredients_text, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    food.source,
    food.barcode ?? null,
    food.name,
    food.brand ?? null,
    food.per100g.kcal,
    food.per100g.carbsG,
    food.per100g.proteinG,
    food.per100g.fatG,
    food.defaultPortionG ?? null,
    food.ingredientsText ?? null,
    now,
    now,
  );
  return r.lastInsertRowId;
}

export async function getFood(db: Db, id: number): Promise<Food | null> {
  const row = await db.getFirstAsync<FoodRow>('SELECT * FROM food WHERE id = ?', id);
  return row ? toFood(row) : null;
}

/** Escaping für LIKE-Muster (`%`, `_`, `\`). */
function likePattern(query: string): string {
  return `%${query.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

/**
 * Lokale Suche im Katalog nach Name oder Marke. Treffer am Wortanfang, Favoriten und
 * zuletzt verwendete Lebensmittel werden bevorzugt.
 */
export async function searchFoods(db: Db, query: string, limit = 30): Promise<Food[]> {
  const q = query.trim();
  if (!q) return [];
  const rows = await db.getAllAsync<FoodRow>(
    `SELECT * FROM food
     WHERE name LIKE ? ESCAPE '\\' OR brand LIKE ? ESCAPE '\\'
     ORDER BY (name LIKE ? ESCAPE '\\') DESC, is_favorite DESC, last_used_at DESC, name COLLATE NOCASE
     LIMIT ?`,
    likePattern(q),
    likePattern(q),
    `${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`,
    limit,
  );
  return rows.map(toFood);
}

/** Favoriten zuerst, dann zuletzt verwendete Lebensmittel. */
export async function recentFoods(db: Db, limit = 20): Promise<Food[]> {
  const rows = await db.getAllAsync<FoodRow>(
    `SELECT * FROM food WHERE is_favorite = 1 OR last_used_at IS NOT NULL
     ORDER BY is_favorite DESC, last_used_at DESC LIMIT ?`,
    limit,
  );
  return rows.map(toFood);
}

export async function setFavorite(db: Db, id: number, favorite: boolean, now: string): Promise<void> {
  await db.runAsync('UPDATE food SET is_favorite = ?, updated_at = ? WHERE id = ?', favorite ? 1 : 0, now, id);
}

export async function touchFood(db: Db, id: number, now: string): Promise<void> {
  await db.runAsync('UPDATE food SET last_used_at = ? WHERE id = ?', now, id);
}
