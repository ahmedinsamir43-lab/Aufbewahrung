/**
 * Anzeigetexte für Profilwerte. Zentral gepflegt, damit Onboarding, Ergebnis-Screen und
 * Einstellungen identische Bezeichnungen verwenden.
 */
import type { IconName } from '@/components/ui/icon';
import { PACE_ADJUSTMENT } from '@/domain/nutrition-plan';
import type { ActivityLevel, DietStyle, Goal, Pace, Sex } from '@/domain/types';

export interface Option<T extends string> {
  value: T;
  title: string;
  help?: string;
  icon: IconName;
}

export const SEX_OPTIONS: Option<Sex>[] = [
  { value: 'female', title: 'Weiblich', icon: 'female' },
  { value: 'male', title: 'Männlich', icon: 'male' },
];

export const GOAL_OPTIONS: Option<Goal>[] = [
  { value: 'lose', title: 'Abnehmen', help: 'Körperfett reduzieren', icon: 'trending_down' },
  { value: 'maintain', title: 'Gewicht halten', help: 'Fit bleiben, bewusster essen', icon: 'balance' },
  { value: 'gain', title: 'Zunehmen', help: 'Muskeln oder Gewicht aufbauen', icon: 'trending_up' },
];

export const ACTIVITY_OPTIONS: Option<ActivityLevel>[] = [
  { value: 'sedentary', title: 'Sitzend', help: 'Bürojob, kaum Sport', icon: 'chair' },
  {
    value: 'light',
    title: 'Leicht aktiv',
    help: 'Viel zu Fuß oder 1–3× Sport pro Woche',
    icon: 'directions_walk',
  },
  {
    value: 'moderate',
    title: 'Mäßig aktiv',
    help: '3–5× Sport pro Woche, z. B. Joggen oder Gym',
    icon: 'directions_run',
  },
  {
    value: 'very',
    title: 'Sehr aktiv',
    help: '6–7× intensives Training pro Woche',
    icon: 'fitness_center',
  },
  {
    value: 'athlete',
    title: 'Athlet',
    help: 'Leistungssport oder körperliche Arbeit plus Training',
    icon: 'sports',
  },
];

function signed(n: number): string {
  return `${n > 0 ? '+' : '−'}${Math.abs(n)} kcal pro Tag`;
}

export function paceOptions(goal: Goal | null): Option<Pace>[] {
  const adj = PACE_ADJUSTMENT[goal === 'gain' ? 'gain' : 'lose'];
  return [
    { value: 'gentle', title: 'Sanft', help: `${signed(adj.gentle)} · gut durchzuhalten`, icon: 'spa' },
    { value: 'steady', title: 'Stetig', help: `${signed(adj.steady)} · ausgewogen`, icon: 'speed' },
    { value: 'aggressive', title: 'Aggressiv', help: `${signed(adj.aggressive)} · fordernd`, icon: 'bolt' },
  ];
}

export const DIET_OPTIONS: Option<DietStyle>[] = [
  { value: 'none', title: 'Keine Präferenz', help: 'Ausgewogene Mischkost', icon: 'restaurant' },
  { value: 'high_protein', title: 'Proteinreich', help: 'Ideal für Muskelaufbau', icon: 'fitness_center' },
  { value: 'low_carb', title: 'Low Carb', help: 'Weniger Kohlenhydrate, mehr Fett', icon: 'egg' },
  { value: 'keto', title: 'Keto', help: 'Höchstens 30 g Kohlenhydrate am Tag', icon: 'local_fire_department' },
  { value: 'vegetarian', title: 'Vegetarisch', help: 'Ohne Fleisch und Fisch', icon: 'eco' },
  { value: 'vegan', title: 'Vegan', help: 'Rein pflanzlich', icon: 'spa' },
];

export function labelOf<T extends string>(options: Option<T>[], value: T | null): string {
  return options.find((o) => o.value === value)?.title ?? '–';
}
