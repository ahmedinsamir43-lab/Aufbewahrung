/**
 * Umrechnung von Nährwerten pro 100 g auf eine Portion sowie Tagessummen.
 * Werte bleiben ungerundet; gerundet wird erst in der Anzeige, damit sich Summen
 * nicht durch Rundungsfehler einzelner Einträge verfälschen.
 */
import type { MacroGrams, Meal, Per100g } from './types';

export interface Nutrients extends MacroGrams {
  kcal: number;
}

export const ZERO_NUTRIENTS: Nutrients = { kcal: 0, carbsG: 0, proteinG: 0, fatG: 0 };

export const PORTION_LIMITS = { min: 1, max: 5000 } as const;

export function scaleNutrients(per100g: Per100g, amountG: number): Nutrients {
  const f = Math.max(0, amountG) / 100;
  return {
    kcal: per100g.kcal * f,
    carbsG: per100g.carbsG * f,
    proteinG: per100g.proteinG * f,
    fatG: per100g.fatG * f,
  };
}

export function addNutrients(a: Nutrients, b: Nutrients): Nutrients {
  return {
    kcal: a.kcal + b.kcal,
    carbsG: a.carbsG + b.carbsG,
    proteinG: a.proteinG + b.proteinG,
    fatG: a.fatG + b.fatG,
  };
}

export function sumNutrients(items: readonly Nutrients[]): Nutrients {
  return items.reduce(addNutrients, ZERO_NUTRIENTS);
}

export interface DayTotals {
  total: Nutrients;
  byMeal: Record<Meal, Nutrients>;
}

export function dayTotals(entries: readonly (Nutrients & { meal: Meal })[]): DayTotals {
  const byMeal: Record<Meal, Nutrients> = {
    breakfast: ZERO_NUTRIENTS,
    lunch: ZERO_NUTRIENTS,
    dinner: ZERO_NUTRIENTS,
    snack: ZERO_NUTRIENTS,
  };
  for (const e of entries) byMeal[e.meal] = addNutrients(byMeal[e.meal], e);
  return { total: sumNutrients(entries), byMeal };
}

/** Kalorienbilanz des Tages: verbleibend (≥ 0) bzw. Überschreitung. */
export function kcalBalance(eaten: number, target: number): { remaining: number; over: number; fraction: number } {
  const diff = Math.round(target - eaten);
  return {
    remaining: Math.max(0, diff),
    over: Math.max(0, -diff),
    fraction: target > 0 ? Math.min(1, Math.max(0, eaten / target)) : 0,
  };
}

/** Parst eine Portionsangabe in Gramm; `null`, wenn ungültig oder außerhalb der Grenzen. */
export function parsePortion(raw: string): number | null {
  const normalized = raw.trim().replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(normalized)) return null;
  const value = Number(normalized);
  return value >= PORTION_LIMITS.min && value <= PORTION_LIMITS.max ? value : null;
}
