import { useLocalSearchParams } from 'expo-router';

import { isLocalDate, toLocalDate } from '@/domain/dates';
import { isMeal, mealForTime } from '@/domain/meals';
import type { Meal } from '@/domain/types';

/** Gemeinsame, validierte Parameter der Erfassungs-Screens. */
export function useAddParams(): {
  date: string;
  meal: Meal;
  foodId: number | null;
  entryId: number | null;
  query: string;
} {
  const p = useLocalSearchParams<{ date?: string; meal?: string; foodId?: string; entryId?: string; q?: string }>();
  const toId = (v?: string) => (v && /^\d+$/.test(v) ? Number(v) : null);
  return {
    date: isLocalDate(p.date) ? p.date : toLocalDate(),
    meal: isMeal(p.meal) ? p.meal : mealForTime(new Date()),
    foodId: toId(p.foodId),
    entryId: toId(p.entryId),
    query: typeof p.q === 'string' ? p.q : '',
  };
}
