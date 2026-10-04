import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';

import { getEntriesForDate } from '@/db/repositories/log';
import { getPlanForDate } from '@/db/repositories/plan';
import { getProfile } from '@/db/repositories/profile';
import { dayTotals, type DayTotals } from '@/domain/portion';
import type { LogEntry, NutritionPlan, Profile } from '@/domain/types';

export interface DayLog {
  entries: LogEntry[];
  totals: DayTotals;
  plan: NutritionPlan | null;
  profile: Profile | null;
}

/** Lädt Einträge, Summen und den am Tag gültigen Plan; neu geladen bei Fokus und Datumswechsel. */
export function useDayLog(date: string): DayLog | null {
  const db = useSQLiteContext();
  const [data, setData] = useState<DayLog | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      Promise.all([getEntriesForDate(db, date), getPlanForDate(db, date), getProfile(db)]).then(
        ([entries, plan, profile]) => {
          if (active) setData({ entries, totals: dayTotals(entries), plan, profile });
        },
      );
      return () => {
        active = false;
      };
    }, [db, date]),
  );

  return data;
}
