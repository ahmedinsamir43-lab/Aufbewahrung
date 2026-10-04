/**
 * Berechnung des individuellen Kalorien- und Makronährstoffplans.
 *
 * - Grundumsatz (BMR) nach Mifflin-St Jeor (Mifflin et al., 1990, Am J Clin Nutr 51(2), 241–247).
 * - Gesamtumsatz (TDEE) = BMR × gebräuchlicher Aktivitätsfaktor (1,2 – 1,9).
 * - Energieäquivalent Körpergewicht ≈ 7.700 kcal/kg (statische Faustregel, vgl. Wishnofsky 1958;
 *   unterschätzt die Dauer, da sich der Energiebedarf beim Abnehmen anpasst, vgl. Hall 2008).
 * - Energiedichte: Kohlenhydrate 4 kcal/g, Eiweiß 4 kcal/g, Fett 9 kcal/g (Atwater-Faktoren).
 *
 * Alle Ergebnisse werden auf ganze Zahlen gerundet. Zwischenwerte (BMR, TDEE) werden vor der
 * Weiterverarbeitung gerundet, damit die angezeigten Zahlen konsistent nachrechenbar sind.
 */
import type { ActivityLevel, DietStyle, Goal, MacroGrams, Pace, Sex } from './types';

export const KCAL_PER_G = { carbs: 4, protein: 4, fat: 9 } as const;
export const KCAL_PER_KG_BODY_WEIGHT = 7700;

export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  very: 1.725,
  athlete: 1.9,
};

/** Tägliche Kalorienanpassung relativ zum TDEE. */
export const PACE_ADJUSTMENT: Record<Exclude<Goal, 'maintain'>, Record<Pace, number>> = {
  lose: { gentle: -300, steady: -500, aggressive: -750 },
  gain: { gentle: 200, steady: 300, aggressive: 500 },
};

/** Absolute Untergrenze der Kalorienzufuhr nach biologischem Geschlecht. */
export const MIN_KCAL: Record<Sex, number> = { male: 1500, female: 1200 };

/** BMI, ab dem für die Eiweißberechnung ein Referenzgewicht statt des aktuellen Gewichts gilt. */
export const BMI_PROTEIN_REFERENCE_THRESHOLD = 30;
/** Referenz-BMI, wenn bei BMI > 30 kein Zielgewicht vorliegt (Ziel „halten"). */
export const BMI_REFERENCE_FALLBACK = 25;

interface MacroRule {
  /** Eiweiß in g pro kg Referenzgewicht. */
  proteinPerKg: number;
  /** Welcher Makronährstoff als fester Anteil bzw. feste Menge vorgegeben ist; der dritte ergibt sich als Rest. */
  fixed: { macro: 'fat' | 'carbs'; pctOfKcal?: number; grams?: number };
}

export const DIET_RULES: Record<DietStyle, MacroRule> = {
  none: { proteinPerKg: 1.6, fixed: { macro: 'fat', pctOfKcal: 0.3 } },
  high_protein: { proteinPerKg: 2.2, fixed: { macro: 'fat', pctOfKcal: 0.25 } },
  low_carb: { proteinPerKg: 1.8, fixed: { macro: 'carbs', pctOfKcal: 0.2 } },
  keto: { proteinPerKg: 1.6, fixed: { macro: 'carbs', grams: 30 } },
  vegetarian: { proteinPerKg: 1.8, fixed: { macro: 'fat', pctOfKcal: 0.3 } },
  vegan: { proteinPerKg: 2.0, fixed: { macro: 'fat', pctOfKcal: 0.3 } },
};

export interface PlanInput {
  sex: Sex;
  ageYears: number;
  heightCm: number;
  weightKg: number;
  goal: Goal;
  targetWeightKg: number | null;
  activityLevel: ActivityLevel;
  pace: Pace | null;
  dietStyle: DietStyle;
}

export interface PlanResult extends MacroGrams {
  bmi: number;
  bmr: number;
  tdee: number;
  kcalTarget: number;
  /** Kalorienziel vor Anwendung der Untergrenze. */
  kcalBeforeFloor: number;
  floorApplied: boolean;
  /** Welche Grenze gegriffen hat (nur gesetzt, wenn `floorApplied`). */
  floorReason: 'bmr' | 'minimum' | null;
  carbsPct: number;
  proteinPct: number;
  fatPct: number;
  proteinReferenceKg: number;
  /** Eiweiß + fester Makroanteil übersteigen das Kalorienziel; der Rest wurde auf 0 g begrenzt. */
  macroConflict: boolean;
  dailyKcalDelta: number;
  estimatedWeeksToTarget: number | null;
}

export function calculateBmi(weightKg: number, heightCm: number): number {
  const m = heightCm / 100;
  return weightKg / (m * m);
}

export function calculateBmr(sex: Sex, weightKg: number, heightCm: number, ageYears: number): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears;
  return Math.round(sex === 'male' ? base + 5 : base - 161);
}

export function calculateTdee(bmr: number, activity: ActivityLevel): number {
  return Math.round(bmr * ACTIVITY_FACTORS[activity]);
}

export function kcalAdjustment(goal: Goal, pace: Pace | null): number {
  if (goal === 'maintain') return 0;
  return PACE_ADJUSTMENT[goal][pace ?? 'steady'];
}

/** Referenzgewicht für die Eiweißberechnung. */
export function proteinReferenceWeight(input: Pick<PlanInput, 'weightKg' | 'heightCm' | 'goal' | 'targetWeightKg'>): number {
  const bmi = calculateBmi(input.weightKg, input.heightCm);
  if (bmi <= BMI_PROTEIN_REFERENCE_THRESHOLD) return input.weightKg;
  if (input.goal !== 'maintain' && input.targetWeightKg != null) return input.targetWeightKg;
  const m = input.heightCm / 100;
  return Math.round(BMI_REFERENCE_FALLBACK * m * m * 10) / 10;
}

export function calculateMacros(
  kcal: number,
  dietStyle: DietStyle,
  referenceKg: number,
): MacroGrams & { macroConflict: boolean } {
  const rule = DIET_RULES[dietStyle];
  const proteinG = Math.round(rule.proteinPerKg * referenceKg);
  const proteinKcal = proteinG * KCAL_PER_G.protein;

  const { macro, pctOfKcal, grams } = rule.fixed;
  const fixedG =
    grams ?? Math.round((kcal * (pctOfKcal ?? 0)) / KCAL_PER_G[macro]);
  const fixedKcal = fixedG * KCAL_PER_G[macro];

  const restMacro = macro === 'fat' ? 'carbs' : 'fat';
  const restKcal = kcal - proteinKcal - fixedKcal;
  const restG = Math.max(0, Math.round(restKcal / KCAL_PER_G[restMacro]));

  return {
    proteinG,
    carbsG: macro === 'carbs' ? fixedG : restG,
    fatG: macro === 'fat' ? fixedG : restG,
    macroConflict: restKcal < 0,
  };
}

/** Prozentanteile der Makros an der Energie aus den gerundeten Grammwerten. */
export function macroPercentages(macros: MacroGrams): { carbsPct: number; proteinPct: number; fatPct: number } {
  const carbs = macros.carbsG * KCAL_PER_G.carbs;
  const protein = macros.proteinG * KCAL_PER_G.protein;
  const fat = macros.fatG * KCAL_PER_G.fat;
  const total = carbs + protein + fat;
  if (total === 0) return { carbsPct: 0, proteinPct: 0, fatPct: 0 };
  return {
    carbsPct: Math.round((carbs / total) * 100),
    proteinPct: Math.round((protein / total) * 100),
    fatPct: Math.round((fat / total) * 100),
  };
}

export function estimateWeeksToTarget(
  weightKg: number,
  targetWeightKg: number | null,
  dailyKcalDelta: number,
): number | null {
  if (targetWeightKg == null || dailyKcalDelta === 0) return null;
  const kgToChange = targetWeightKg - weightKg;
  // Richtung von Gewichtsänderung und Energiebilanz muss übereinstimmen.
  if (Math.sign(kgToChange) !== Math.sign(dailyKcalDelta)) return null;
  const days = (Math.abs(kgToChange) * KCAL_PER_KG_BODY_WEIGHT) / Math.abs(dailyKcalDelta);
  return Math.max(1, Math.round(days / 7));
}

export function calculatePlan(input: PlanInput): PlanResult {
  const bmi = calculateBmi(input.weightKg, input.heightCm);
  const bmr = calculateBmr(input.sex, input.weightKg, input.heightCm, input.ageYears);
  const tdee = calculateTdee(bmr, input.activityLevel);
  const kcalBeforeFloor = tdee + kcalAdjustment(input.goal, input.pace);

  const floor = Math.max(bmr, MIN_KCAL[input.sex]);
  const floorApplied = kcalBeforeFloor < floor;
  const kcalTarget = floorApplied ? floor : kcalBeforeFloor;
  const floorReason = floorApplied ? (bmr >= MIN_KCAL[input.sex] ? 'bmr' : 'minimum') : null;

  const proteinReferenceKg = proteinReferenceWeight(input);
  const { macroConflict, ...macros } = calculateMacros(kcalTarget, input.dietStyle, proteinReferenceKg);
  const dailyKcalDelta = kcalTarget - tdee;

  return {
    bmi: Math.round(bmi * 10) / 10,
    bmr,
    tdee,
    kcalTarget,
    kcalBeforeFloor,
    floorApplied,
    floorReason,
    ...macros,
    ...macroPercentages(macros),
    proteinReferenceKg,
    macroConflict,
    dailyKcalDelta,
    estimatedWeeksToTarget:
      input.goal === 'maintain'
        ? null
        : estimateWeeksToTarget(input.weightKg, input.targetWeightKg, dailyKcalDelta),
  };
}
