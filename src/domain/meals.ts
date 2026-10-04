import type { Meal } from './types';

export const MEALS: readonly Meal[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export const MEAL_LABELS: Record<Meal, string> = {
  breakfast: 'Frühstück',
  lunch: 'Mittagessen',
  dinner: 'Abendessen',
  snack: 'Snacks',
};

export function isMeal(value: unknown): value is Meal {
  return typeof value === 'string' && (MEALS as readonly string[]).includes(value);
}

/** Sinnvolle Vorauswahl der Mahlzeit nach Uhrzeit. */
export function mealForTime(date: Date): Meal {
  const minutes = date.getHours() * 60 + date.getMinutes();
  if (minutes >= 4 * 60 && minutes < 10 * 60 + 30) return 'breakfast';
  if (minutes >= 11 * 60 && minutes < 14 * 60 + 30) return 'lunch';
  if (minutes >= 17 * 60 + 30 && minutes < 21 * 60 + 30) return 'dinner';
  return 'snack';
}
