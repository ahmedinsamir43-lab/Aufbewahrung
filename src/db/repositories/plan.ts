import type { PlanResult } from '@/domain/nutrition-plan';
import type { NutritionPlan } from '@/domain/types';

import type { Db } from '../database';

interface PlanRow {
  id: number;
  valid_from: string;
  bmr: number;
  tdee: number;
  kcal_target: number;
  carbs_g: number;
  protein_g: number;
  fat_g: number;
  carbs_pct: number;
  protein_pct: number;
  fat_pct: number;
  floor_applied: number;
  protein_reference_kg: number;
  est_weeks_to_target: number | null;
  created_at: string;
}

function toPlan(row: PlanRow): NutritionPlan {
  return {
    id: row.id,
    validFrom: row.valid_from,
    bmr: row.bmr,
    tdee: row.tdee,
    kcalTarget: row.kcal_target,
    carbsG: row.carbs_g,
    proteinG: row.protein_g,
    fatG: row.fat_g,
    carbsPct: row.carbs_pct,
    proteinPct: row.protein_pct,
    fatPct: row.fat_pct,
    floorApplied: row.floor_applied === 1,
    proteinReferenceKg: row.protein_reference_kg,
    estimatedWeeksToTarget: row.est_weeks_to_target,
    createdAt: row.created_at,
  };
}

export async function insertPlan(
  db: Db,
  plan: PlanResult,
  validFrom: string,
  now: string,
): Promise<number> {
  const result = await db.runAsync(
    `INSERT INTO nutrition_plan (valid_from, bmr, tdee, kcal_target, carbs_g, protein_g, fat_g,
       carbs_pct, protein_pct, fat_pct, floor_applied, protein_reference_kg, est_weeks_to_target,
       created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    validFrom,
    plan.bmr,
    plan.tdee,
    plan.kcalTarget,
    plan.carbsG,
    plan.proteinG,
    plan.fatG,
    plan.carbsPct,
    plan.proteinPct,
    plan.fatPct,
    plan.floorApplied ? 1 : 0,
    plan.proteinReferenceKg,
    plan.estimatedWeeksToTarget,
    now,
  );
  return result.lastInsertRowId;
}

/** Plan, der an `date` gültig war: jüngster Plan mit `valid_from <= date`. */
export async function getPlanForDate(db: Db, date: string): Promise<NutritionPlan | null> {
  const row = await db.getFirstAsync<PlanRow>(
    'SELECT * FROM nutrition_plan WHERE valid_from <= ? ORDER BY valid_from DESC, id DESC LIMIT 1',
    date,
  );
  return row ? toPlan(row) : null;
}
