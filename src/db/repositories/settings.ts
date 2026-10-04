import type { Db } from '../database';

export const SETTING_KEYS = {
  onboardingDraft: 'onboarding_draft',
  recognition: 'recognition_config',
  recognitionDraftToken: 'recognition_draft_token',
} as const;

export async function getSetting<T>(db: Db, key: string): Promise<T | null> {
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM app_setting WHERE key = ?', key);
  if (!row) return null;
  try {
    return JSON.parse(row.value) as T;
  } catch {
    return null;
  }
}

export async function setSetting(db: Db, key: string, value: unknown): Promise<void> {
  await db.runAsync(
    `INSERT INTO app_setting (key, value) VALUES (?, ?)
     ON CONFLICT (key) DO UPDATE SET value = excluded.value`,
    key,
    JSON.stringify(value),
  );
}

export async function deleteSetting(db: Db, key: string): Promise<void> {
  await db.runAsync('DELETE FROM app_setting WHERE key = ?', key);
}
