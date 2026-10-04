import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';

import { getPlanForDate } from '@/db/repositories/plan';
import { getProfile } from '@/db/repositories/profile';
import { toLocalDate } from '@/domain/dates';
import type { NutritionPlan, Profile } from '@/domain/types';

type State =
  | { status: 'loading' }
  | { status: 'ready'; profile: Profile | null; plan: NutritionPlan | null };

/** Lädt Profil und heute gültigen Plan; aktualisiert sich, sobald der Screen fokussiert wird. */
export function useProfileAndPlan(): State {
  const db = useSQLiteContext();
  const [state, setState] = useState<State>({ status: 'loading' });

  useFocusEffect(
    useCallback(() => {
      let active = true;
      Promise.all([getProfile(db), getPlanForDate(db, toLocalDate())]).then(([profile, plan]) => {
        if (active) setState({ status: 'ready', profile, plan });
      });
      return () => {
        active = false;
      };
    }, [db]),
  );

  return state;
}
