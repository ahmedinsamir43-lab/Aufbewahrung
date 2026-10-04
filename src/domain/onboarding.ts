/**
 * Ablauf des Onboarding-Interviews: Reihenfolge, Überspringregeln und Validierung.
 * Eingaben werden als Rohtext gehalten (so wie getippt) und erst bei der Validierung geparst.
 */
import { calculateBmi } from './nutrition-plan';
import type { ActivityLevel, DietStyle, Goal, Pace, Profile, Sex } from './types';

export const STEP_IDS = [
  'firstName',
  'age',
  'sex',
  'height',
  'weight',
  'goal',
  'targetWeight',
  'activityLevel',
  'pace',
  'dietStyle',
  'notes',
] as const;
export type StepId = (typeof STEP_IDS)[number];

export interface OnboardingDraft {
  firstName: string;
  age: string;
  sex: Sex | null;
  height: string;
  weight: string;
  goal: Goal | null;
  targetWeight: string;
  activityLevel: ActivityLevel | null;
  pace: Pace | null;
  dietStyle: DietStyle | null;
  avoidFoods: string;
  healthNote: string;
}

export const EMPTY_DRAFT: OnboardingDraft = {
  firstName: '',
  age: '',
  sex: null,
  height: '',
  weight: '',
  goal: null,
  targetWeight: '',
  activityLevel: null,
  pace: null,
  dietStyle: null,
  avoidFoods: '',
  healthNote: '',
};

export const LIMITS = {
  age: { min: 18, max: 100 },
  height: { min: 120, max: 230 },
  weight: { min: 35, max: 300 },
  firstNameMaxLength: 40,
  /** WHO-Grenze zum Untergewicht. */
  minTargetBmi: 18.5,
} as const;

/** Schritte, die für den aktuellen Entwurf sichtbar sind („halten" überspringt Zielgewicht und Tempo). */
export function visibleSteps(draft: Pick<OnboardingDraft, 'goal'>): StepId[] {
  if (draft.goal !== 'maintain') return [...STEP_IDS];
  return STEP_IDS.filter((id) => id !== 'targetWeight' && id !== 'pace');
}

export function nextStep(current: StepId, draft: OnboardingDraft): StepId | null {
  const steps = visibleSteps(draft);
  const i = steps.indexOf(current);
  return i >= 0 && i < steps.length - 1 ? steps[i + 1] : null;
}

export function previousStep(current: StepId, draft: OnboardingDraft): StepId | null {
  const steps = visibleSteps(draft);
  const i = steps.indexOf(current);
  return i > 0 ? steps[i - 1] : null;
}

/** Fortschritt 0–1 nach Beantwortung des aktuellen Schritts. */
export function progressOf(current: StepId, draft: OnboardingDraft): number {
  const steps = visibleSteps(draft);
  const i = steps.indexOf(current);
  return i < 0 ? 0 : (i + 1) / steps.length;
}

/** Akzeptiert Komma und Punkt als Dezimaltrennzeichen. Gibt `null` für ungültige Eingaben zurück. */
export function parseDecimal(raw: string): number | null {
  const normalized = raw.trim().replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(normalized)) return null;
  return Number(normalized);
}

function rangeError(
  value: number | null,
  { min, max }: { min: number; max: number },
  unit: string,
  label: string,
): string | null {
  if (value == null) return `Bitte gib ${label} als Zahl ein.`;
  if (value < min || value > max) return `Bitte gib einen Wert zwischen ${min} und ${max} ${unit} ein.`;
  return null;
}

/** Validiert einen einzelnen Schritt. Gibt eine verständliche Fehlermeldung oder `null` zurück. */
export function validateStep(step: StepId, draft: OnboardingDraft): string | null {
  switch (step) {
    case 'firstName': {
      const name = draft.firstName.trim();
      if (name.length === 0) return 'Bitte gib deinen Vornamen ein.';
      if (name.length > LIMITS.firstNameMaxLength)
        return `Der Name darf höchstens ${LIMITS.firstNameMaxLength} Zeichen lang sein.`;
      return null;
    }
    case 'age': {
      const age = parseDecimal(draft.age);
      if (age != null && !Number.isInteger(age)) return 'Bitte gib dein Alter in ganzen Jahren ein.';
      if (age != null && age < LIMITS.age.min)
        return 'Die Berechnung ist für Erwachsene ab 18 Jahren ausgelegt.';
      return rangeError(age, LIMITS.age, 'Jahren', 'dein Alter');
    }
    case 'sex':
      return draft.sex ? null : 'Bitte wähle eine Option.';
    case 'height':
      return rangeError(parseDecimal(draft.height), LIMITS.height, 'cm', 'deine Größe');
    case 'weight':
      return rangeError(parseDecimal(draft.weight), LIMITS.weight, 'kg', 'dein Gewicht');
    case 'goal':
      return draft.goal ? null : 'Bitte wähle dein Ziel.';
    case 'targetWeight': {
      const target = parseDecimal(draft.targetWeight);
      const basic = rangeError(target, LIMITS.weight, 'kg', 'dein Zielgewicht');
      if (basic || target == null) return basic;
      const weight = parseDecimal(draft.weight);
      const height = parseDecimal(draft.height);
      if (weight == null || height == null) return null;
      if (draft.goal === 'lose' && target >= weight)
        return 'Zum Abnehmen muss das Zielgewicht unter deinem aktuellen Gewicht liegen.';
      if (draft.goal === 'gain' && target <= weight)
        return 'Zum Zunehmen muss das Zielgewicht über deinem aktuellen Gewicht liegen.';
      if (draft.goal === 'lose' && calculateBmi(target, height) < LIMITS.minTargetBmi) {
        const minKg = Math.ceil(LIMITS.minTargetBmi * (height / 100) ** 2);
        return `Dieses Zielgewicht läge im Untergewicht. Wähle mindestens ${minKg} kg.`;
      }
      return null;
    }
    case 'activityLevel':
      return draft.activityLevel ? null : 'Bitte wähle dein Aktivitätslevel.';
    case 'pace':
      return draft.pace ? null : 'Bitte wähle ein Tempo.';
    case 'dietStyle':
      return draft.dietStyle ? null : 'Bitte wähle einen Ernährungsstil.';
    case 'notes':
      if (draft.healthNote.length > 500) return 'Die Notiz darf höchstens 500 Zeichen lang sein.';
      return null;
  }
}

/** Zerlegt eine Freitext-Liste („Erdnüsse, Laktose; Sellerie") in eindeutige Schlagwörter. */
export function parseAvoidFoods(raw: string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const part of raw.split(/[,;\n]+/)) {
    const term = part.trim().slice(0, 40);
    const key = term.toLocaleLowerCase('de-DE');
    if (term.length > 0 && !seen.has(key)) {
      seen.add(key);
      result.push(term);
    }
  }
  return result;
}

export type DraftConversion =
  | { ok: true; profile: Omit<Profile, 'updatedAt'> }
  | { ok: false; step: StepId; error: string };

/** Validiert alle sichtbaren Schritte und wandelt den Entwurf in ein Profil um. */
export function draftToProfile(draft: OnboardingDraft): DraftConversion {
  for (const step of visibleSteps(draft)) {
    const error = validateStep(step, draft);
    if (error) return { ok: false, step, error };
  }
  const maintain = draft.goal === 'maintain';
  const healthNote = draft.healthNote.trim();
  return {
    ok: true,
    profile: {
      firstName: draft.firstName.trim(),
      ageYears: parseDecimal(draft.age)!,
      sex: draft.sex!,
      heightCm: parseDecimal(draft.height)!,
      weightKg: parseDecimal(draft.weight)!,
      goal: draft.goal!,
      targetWeightKg: maintain ? null : parseDecimal(draft.targetWeight)!,
      activityLevel: draft.activityLevel!,
      pace: maintain ? null : draft.pace!,
      dietStyle: draft.dietStyle!,
      avoidFoods: parseAvoidFoods(draft.avoidFoods),
      healthNote: healthNote.length > 0 ? healthNote : null,
    },
  };
}

/** Umkehrung für die Einstellungen: bestehendes Profil als bearbeitbarer Entwurf. */
export function profileToDraft(profile: Omit<Profile, 'updatedAt'>): OnboardingDraft {
  const fmt = (n: number) => String(n).replace('.', ',');
  return {
    firstName: profile.firstName,
    age: String(profile.ageYears),
    sex: profile.sex,
    height: fmt(profile.heightCm),
    weight: fmt(profile.weightKg),
    goal: profile.goal,
    targetWeight: profile.targetWeightKg != null ? fmt(profile.targetWeightKg) : '',
    activityLevel: profile.activityLevel,
    pace: profile.pace,
    dietStyle: profile.dietStyle,
    avoidFoods: profile.avoidFoods.join(', '),
    healthNote: profile.healthNote ?? '',
  };
}
