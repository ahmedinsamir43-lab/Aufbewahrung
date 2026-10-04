/**
 * Domänenmodell der App. Reine TypeScript-Typen ohne React-Native-Abhängigkeiten,
 * damit Berechnungslogik und Datenzugriff isoliert getestet werden können.
 *
 * Konventionen:
 * - Gewichte in g bzw. kg, Energie in kcal.
 * - Nährwerte von Lebensmitteln werden immer pro 100 g gespeichert.
 * - Kalenderdaten als lokales ISO-Datum `YYYY-MM-DD`, Zeitstempel als ISO-8601-String.
 */

export type Sex = 'male' | 'female';
export type Goal = 'lose' | 'maintain' | 'gain';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'very' | 'athlete';
export type Pace = 'gentle' | 'steady' | 'aggressive';
export type DietStyle =
  | 'none'
  | 'high_protein'
  | 'low_carb'
  | 'keto'
  | 'vegetarian'
  | 'vegan';
export type Meal = 'breakfast' | 'lunch' | 'dinner' | 'snack';

/** Herkunft eines Lebensmittels bzw. eines Protokolleintrags. */
export type FoodSource = 'openfoodfacts' | 'manual' | 'photo';

/** Antworten aus dem Onboarding-Interview; in den Einstellungen änderbar. */
export interface Profile {
  firstName: string;
  ageYears: number;
  sex: Sex;
  heightCm: number;
  weightKg: number;
  goal: Goal;
  /** `null`, wenn Ziel = „halten". */
  targetWeightKg: number | null;
  activityLevel: ActivityLevel;
  /** `null`, wenn Ziel = „halten". */
  pace: Pace | null;
  dietStyle: DietStyle;
  /** Lebensmittel, die gemieden werden sollen (Schlagwörter für Warnhinweise). */
  avoidFoods: string[];
  /** Freitextliche gesundheitliche Notiz; löst den Hinweis zur ärztlichen Abklärung aus. */
  healthNote: string | null;
  updatedAt: string;
}

export interface MacroGrams {
  carbsG: number;
  proteinG: number;
  fatG: number;
}

/**
 * Berechneter Ernährungsplan. Pläne werden versioniert gespeichert (nie überschrieben),
 * damit der Verlauf vergangene Tage gegen den damals gültigen Plan bewertet.
 */
export interface NutritionPlan extends MacroGrams {
  id: number;
  validFrom: string;
  bmr: number;
  tdee: number;
  kcalTarget: number;
  carbsPct: number;
  proteinPct: number;
  fatPct: number;
  /** Untergrenze (BMR bzw. 1.200/1.500 kcal) hat gegriffen. */
  floorApplied: boolean;
  /** Referenzgewicht für die Eiweißberechnung (aktuelles oder Zielgewicht bei BMI > 30). */
  proteinReferenceKg: number;
  /** Geschätzte Dauer bis zum Zielgewicht in Wochen; `null` bei „halten". */
  estimatedWeeksToTarget: number | null;
  createdAt: string;
}

/** Nährwerte pro 100 g. */
export interface Per100g {
  kcal: number;
  carbsG: number;
  proteinG: number;
  fatG: number;
}

/** Lokaler Lebensmittelkatalog: Cache aus Open Food Facts, manuelle Einträge, Favoriten. */
export interface Food {
  id: number;
  source: FoodSource;
  barcode: string | null;
  name: string;
  brand: string | null;
  per100g: Per100g;
  defaultPortionG: number | null;
  /** Zutatenliste (falls bekannt) – Grundlage für den Abgleich mit gemiedenen Lebensmitteln. */
  ingredientsText: string | null;
  isFavorite: boolean;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Tagesprotokoll-Eintrag. Name und Nährwerte werden als Momentaufnahme gespeichert,
 * sodass spätere Änderungen am Lebensmittel die Historie nicht verfälschen.
 */
export interface LogEntry extends MacroGrams {
  id: number;
  date: string;
  meal: Meal;
  foodId: number | null;
  name: string;
  amountG: number;
  kcal: number;
  source: FoodSource;
  /** Foto-Erkennung mit niedriger Konfidenz → in der UI als Schätzung gekennzeichnet. */
  isEstimate: boolean;
  /** Konfidenz der Foto-Erkennung (0–1), sonst `null`. */
  confidence: number | null;
  createdAt: string;
}

export type PendingScanStatus = 'pending' | 'resolved' | 'not_found';

/** Offline erfasster Barcode, der später bei Open Food Facts abgerufen wird. */
export interface PendingScan {
  id: number;
  barcode: string;
  date: string;
  meal: Meal;
  status: PendingScanStatus;
  attempts: number;
  lastError: string | null;
  createdAt: string;
}
