/**
 * Validierung manuell erfasster Lebensmittel (Nährwerte pro 100 g).
 */
import { KCAL_PER_G } from './nutrition-plan';
import { parseDecimal } from './onboarding';
import type { Per100g } from './types';

export interface FoodDraft {
  name: string;
  brand: string;
  kcal: string;
  carbs: string;
  protein: string;
  fat: string;
  defaultPortion: string;
}

export const EMPTY_FOOD_DRAFT: FoodDraft = {
  name: '',
  brand: '',
  kcal: '',
  carbs: '',
  protein: '',
  fat: '',
  defaultPortion: '',
};

export type FoodField = keyof FoodDraft;

export interface ValidFood {
  name: string;
  brand: string | null;
  per100g: Per100g;
  defaultPortionG: number | null;
}

/** Physikalische Obergrenze: reines Fett hat ca. 900 kcal pro 100 g. */
const MAX_KCAL_100G = 900;

/** Energie aus den Makros nach Atwater (ohne Ballaststoffe/Alkohol). */
export function atwaterKcal(per100g: Omit<Per100g, 'kcal'>): number {
  return per100g.carbsG * KCAL_PER_G.carbs + per100g.proteinG * KCAL_PER_G.protein + per100g.fatG * KCAL_PER_G.fat;
}

export function validateFood(
  draft: FoodDraft,
): { ok: true; food: ValidFood; warning: string | null } | { ok: false; errors: Partial<Record<FoodField, string>> } {
  const errors: Partial<Record<FoodField, string>> = {};
  const name = draft.name.trim();
  if (!name) errors.name = 'Bitte gib einen Namen ein.';
  else if (name.length > 80) errors.name = 'Höchstens 80 Zeichen.';

  const num = (field: 'kcal' | 'carbs' | 'protein' | 'fat', max: number): number => {
    const v = parseDecimal(draft[field]);
    if (v == null) errors[field] = 'Bitte eine Zahl eingeben.';
    else if (v > max) errors[field] = `Höchstens ${max} pro 100 g.`;
    return v ?? 0;
  };
  const kcal = num('kcal', MAX_KCAL_100G);
  const carbsG = num('carbs', 100);
  const proteinG = num('protein', 100);
  const fatG = num('fat', 100);

  if (!errors.carbs && !errors.protein && !errors.fat && carbsG + proteinG + fatG > 100) {
    errors.fat = 'Kohlenhydrate, Eiweiß und Fett ergeben zusammen mehr als 100 g.';
  }

  let defaultPortionG: number | null = null;
  if (draft.defaultPortion.trim()) {
    const p = parseDecimal(draft.defaultPortion);
    if (p == null || p < 1 || p > 5000) errors.defaultPortion = 'Bitte 1 bis 5000 g eingeben.';
    else defaultPortionG = p;
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  // Plausibilitätsprüfung: Abweichung > 20 % und > 30 kcal zwischen Angabe und Makros.
  const estimated = atwaterKcal({ carbsG, proteinG, fatG });
  const deviation = Math.abs(estimated - kcal);
  const warning =
    deviation > 30 && deviation > 0.2 * Math.max(kcal, estimated)
      ? `Die Kalorien passen nicht ganz zu den Makros (rechnerisch ca. ${Math.round(estimated)} kcal). Bitte prüfe die Angaben.`
      : null;

  return {
    ok: true,
    food: {
      name,
      brand: draft.brand.trim() || null,
      per100g: { kcal, carbsG, proteinG, fatG },
      defaultPortionG,
    },
    warning,
  };
}
