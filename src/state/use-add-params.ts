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
  /** Offener Scan aus der Warteschlange, der mit dem Speichern erledigt wird. */
  scanId: number | null;
  barcode: string | null;
  query: string;
  brand: string;
} {
  const p = useLocalSearchParams<{
    date?: string;
    meal?: string;
    foodId?: string;
    entryId?: string;
    scanId?: string;
    barcode?: string;
    q?: string;
    brand?: string;
  }>();
  const toId = (v?: string) => (v && /^\d+$/.test(v) ? Number(v) : null);
  return {
    date: isLocalDate(p.date) ? p.date : toLocalDate(),
    meal: isMeal(p.meal) ? p.meal : mealForTime(new Date()),
    foodId: toId(p.foodId),
    entryId: toId(p.entryId),
    scanId: toId(p.scanId),
    barcode: typeof p.barcode === 'string' && /^\d{8,14}$/.test(p.barcode) ? p.barcode : null,
    query: typeof p.q === 'string' ? p.q : '',
    brand: typeof p.brand === 'string' ? p.brand : '',
  };
}
