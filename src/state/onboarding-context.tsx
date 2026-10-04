import { useSQLiteContext } from 'expo-sqlite';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { getSetting, setSetting, SETTING_KEYS } from '@/db/repositories/settings';
import { EMPTY_DRAFT, STEP_IDS, type OnboardingDraft, type StepId } from '@/domain/onboarding';

interface StoredDraft {
  step: StepId;
  draft: OnboardingDraft;
}

interface OnboardingState {
  loaded: boolean;
  step: StepId;
  draft: OnboardingDraft;
  setStep: (step: StepId) => void;
  update: (patch: Partial<OnboardingDraft>) => void;
}

const OnboardingContext = createContext<OnboardingState | null>(null);

const SAVE_DELAY_MS = 300;

/**
 * Hält den Interview-Entwurf und sichert ihn (verzögert) in `app_setting`, damit ein
 * unterbrochenes Onboarding nach einem Neustart an derselben Stelle fortgesetzt wird.
 */
export function OnboardingProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const [loaded, setLoaded] = useState(false);
  const [step, setStep] = useState<StepId>('firstName');
  const [draft, setDraft] = useState<OnboardingDraft>(EMPTY_DRAFT);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let active = true;
    getSetting<StoredDraft>(db, SETTING_KEYS.onboardingDraft)
      .then((stored) => {
        if (!active || !stored) return;
        if (STEP_IDS.includes(stored.step)) setStep(stored.step);
        setDraft({ ...EMPTY_DRAFT, ...stored.draft });
      })
      .finally(() => active && setLoaded(true));
    return () => {
      active = false;
    };
  }, [db]);

  useEffect(() => {
    if (!loaded) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      setSetting(db, SETTING_KEYS.onboardingDraft, { step, draft } satisfies StoredDraft).catch(
        () => {},
      );
    }, SAVE_DELAY_MS);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [db, loaded, step, draft]);

  const update = useCallback((patch: Partial<OnboardingDraft>) => {
    setDraft((d) => ({ ...d, ...patch }));
  }, []);

  const value = useMemo(
    () => ({ loaded, step, draft, setStep, update }),
    [loaded, step, draft, update],
  );

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding(): OnboardingState {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboarding muss innerhalb von OnboardingProvider verwendet werden.');
  return ctx;
}
