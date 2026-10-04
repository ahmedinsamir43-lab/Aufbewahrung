import type { Profile } from '@/domain/types';

import type { Db } from '../database';

interface ProfileRow {
  first_name: string;
  age_years: number;
  sex: Profile['sex'];
  height_cm: number;
  weight_kg: number;
  goal: Profile['goal'];
  target_weight_kg: number | null;
  activity_level: Profile['activityLevel'];
  pace: Profile['pace'];
  diet_style: Profile['dietStyle'];
  avoid_foods: string;
  health_note: string | null;
  updated_at: string;
}

function parseAvoidFoods(json: string): string[] {
  try {
    const value: unknown = JSON.parse(json);
    return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

export async function getProfile(db: Db): Promise<Profile | null> {
  const row = await db.getFirstAsync<ProfileRow>('SELECT * FROM profile WHERE id = 1');
  if (!row) return null;
  return {
    firstName: row.first_name,
    ageYears: row.age_years,
    sex: row.sex,
    heightCm: row.height_cm,
    weightKg: row.weight_kg,
    goal: row.goal,
    targetWeightKg: row.target_weight_kg,
    activityLevel: row.activity_level,
    pace: row.pace,
    dietStyle: row.diet_style,
    avoidFoods: parseAvoidFoods(row.avoid_foods),
    healthNote: row.health_note,
    updatedAt: row.updated_at,
  };
}

/** Legt das Profil an oder überschreibt es (es gibt genau ein Profil). */
export async function saveProfile(db: Db, profile: Omit<Profile, 'updatedAt'>, now: string): Promise<void> {
  await db.runAsync(
    `INSERT INTO profile (id, first_name, age_years, sex, height_cm, weight_kg, goal,
       target_weight_kg, activity_level, pace, diet_style, avoid_foods, health_note, updated_at)
     VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (id) DO UPDATE SET
       first_name = excluded.first_name, age_years = excluded.age_years, sex = excluded.sex,
       height_cm = excluded.height_cm, weight_kg = excluded.weight_kg, goal = excluded.goal,
       target_weight_kg = excluded.target_weight_kg, activity_level = excluded.activity_level,
       pace = excluded.pace, diet_style = excluded.diet_style, avoid_foods = excluded.avoid_foods,
       health_note = excluded.health_note, updated_at = excluded.updated_at`,
    profile.firstName,
    profile.ageYears,
    profile.sex,
    profile.heightCm,
    profile.weightKg,
    profile.goal,
    profile.targetWeightKg,
    profile.activityLevel,
    profile.pace,
    profile.dietStyle,
    JSON.stringify(profile.avoidFoods),
    profile.healthNote,
    now,
  );
}
