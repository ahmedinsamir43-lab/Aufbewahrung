import { inTransaction, type Db } from '@/db/database';
import { insertPlan } from '@/db/repositories/plan';
import { saveProfile } from '@/db/repositories/profile';
import { deleteSetting, SETTING_KEYS } from '@/db/repositories/settings';
import { toLocalDate } from '@/domain/dates';
import { calculatePlan, type PlanResult } from '@/domain/nutrition-plan';
import type { Profile } from '@/domain/types';

/**
 * Speichert das Profil, berechnet den Plan und legt ihn als neue Version ab (gültig ab heute).
 * Wird nach dem Onboarding und nach jeder Profiländerung in den Einstellungen aufgerufen.
 */
export async function saveProfileAndPlan(
  db: Db,
  profile: Omit<Profile, 'updatedAt'>,
  now: Date = new Date(),
): Promise<PlanResult> {
  const plan = calculatePlan(profile);
  const timestamp = now.toISOString();
  await inTransaction(db, async () => {
    await saveProfile(db, profile, timestamp);
    await insertPlan(db, plan, toLocalDate(now), timestamp);
    await deleteSetting(db, SETTING_KEYS.onboardingDraft);
  });
  return plan;
}
