/**
 * @jest-environment node
 */
import { toLocalDate } from '@/domain/dates';
import { calculatePlan } from '@/domain/nutrition-plan';
import type { Profile } from '@/domain/types';
import { saveProfileAndPlan } from '@/services/profile-service';

import { getPlanForDate, insertPlan } from '../repositories/plan';
import { getProfile, saveProfile } from '../repositories/profile';
import { deleteSetting, getSetting, setSetting, SETTING_KEYS } from '../repositories/settings';
import { createMigratedDb } from '../testing/node-sqlite';

const profile: Omit<Profile, 'updatedAt'> = {
  firstName: 'Alex',
  ageYears: 30,
  sex: 'male',
  heightCm: 180,
  weightKg: 80,
  goal: 'lose',
  targetWeightKg: 75,
  activityLevel: 'moderate',
  pace: 'steady',
  dietStyle: 'none',
  avoidFoods: ['Erdnüsse', 'Laktose'],
  healthNote: null,
};

describe('Profil-Repository', () => {
  it('liefert null ohne Profil', async () => {
    const db = await createMigratedDb();
    await expect(getProfile(db)).resolves.toBeNull();
  });

  it('speichert und lädt ein Profil vollständig', async () => {
    const db = await createMigratedDb();
    await saveProfile(db, profile, '2026-10-04T10:00:00.000Z');
    await expect(getProfile(db)).resolves.toEqual({ ...profile, updatedAt: '2026-10-04T10:00:00.000Z' });
  });

  it('überschreibt das bestehende Profil', async () => {
    const db = await createMigratedDb();
    await saveProfile(db, profile, '2026-10-04T10:00:00.000Z');
    await saveProfile(db, { ...profile, weightKg: 78, healthNote: 'Bluthochdruck' }, '2026-10-05T10:00:00.000Z');
    const loaded = await getProfile(db);
    expect(loaded?.weightKg).toBe(78);
    expect(loaded?.healthNote).toBe('Bluthochdruck');
    const count = db.raw.prepare('SELECT COUNT(*) AS n FROM profile').get() as { n: number };
    expect(count.n).toBe(1);
  });
});

describe('Plan-Repository', () => {
  it('liefert den an einem Datum gültigen Plan (Versionierung)', async () => {
    const db = await createMigratedDb();
    const p1 = calculatePlan(profile);
    const p2 = calculatePlan({ ...profile, weightKg: 78 });
    await insertPlan(db, p1, '2026-10-01', '2026-10-01T08:00:00.000Z');
    await insertPlan(db, p2, '2026-10-10', '2026-10-10T08:00:00.000Z');

    await expect(getPlanForDate(db, '2026-09-30')).resolves.toBeNull();
    expect((await getPlanForDate(db, '2026-10-05'))?.kcalTarget).toBe(p1.kcalTarget);
    expect((await getPlanForDate(db, '2026-10-10'))?.kcalTarget).toBe(p2.kcalTarget);
    expect((await getPlanForDate(db, '2026-12-01'))?.proteinG).toBe(p2.proteinG);
  });

  it('nimmt bei mehreren Plänen am selben Tag den zuletzt angelegten', async () => {
    const db = await createMigratedDb();
    await insertPlan(db, calculatePlan(profile), '2026-10-04', 'a');
    await insertPlan(db, calculatePlan({ ...profile, dietStyle: 'keto' }), '2026-10-04', 'b');
    expect((await getPlanForDate(db, '2026-10-04'))?.carbsG).toBe(30);
  });
});

describe('Einstellungen', () => {
  it('speichert JSON-Werte und löscht sie', async () => {
    const db = await createMigratedDb();
    await setSetting(db, 'x', { step: 'age', draft: { firstName: 'A' } });
    await expect(getSetting(db, 'x')).resolves.toEqual({ step: 'age', draft: { firstName: 'A' } });
    await setSetting(db, 'x', 1);
    await expect(getSetting(db, 'x')).resolves.toBe(1);
    await deleteSetting(db, 'x');
    await expect(getSetting(db, 'x')).resolves.toBeNull();
  });
});

describe('saveProfileAndPlan', () => {
  it('speichert Profil und Plan atomar und entfernt den Onboarding-Entwurf', async () => {
    const db = await createMigratedDb();
    await setSetting(db, SETTING_KEYS.onboardingDraft, { step: 'notes' });
    const now = new Date(2026, 9, 4, 12, 0);
    const plan = await saveProfileAndPlan(db, profile, now);

    expect((await getProfile(db))?.firstName).toBe('Alex');
    const stored = await getPlanForDate(db, toLocalDate(now));
    expect(stored).toMatchObject({ kcalTarget: plan.kcalTarget, validFrom: '2026-10-04' });
    await expect(getSetting(db, SETTING_KEYS.onboardingDraft)).resolves.toBeNull();
  });

  it('rollt bei einem Fehler vollständig zurück', async () => {
    const db = await createMigratedDb();
    // Verletzt den CHECK-Constraint für die Größe → Plan darf nicht gespeichert werden.
    await expect(saveProfileAndPlan(db, { ...profile, heightCm: 20 })).rejects.toThrow();
    await expect(getProfile(db)).resolves.toBeNull();
    const count = db.raw.prepare('SELECT COUNT(*) AS n FROM nutrition_plan').get() as { n: number };
    expect(count.n).toBe(0);
  });
});
