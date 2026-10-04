import type { StepId } from '@/domain/onboarding';

export interface QuestionText {
  title: (name: string) => string;
  help?: string;
}

/** Fragetexte in einfacher Sprache; technische Fragen haben eine Hilfszeile. */
export const QUESTIONS: Record<StepId, QuestionText> = {
  firstName: {
    title: () => 'Wie heißt du?',
    help: 'Damit wir dich persönlich ansprechen können.',
  },
  age: {
    title: (n) => `Wie alt bist du, ${n}?`,
    help: 'Mit dem Alter verändert sich der Kalorienverbrauch in Ruhe.',
  },
  sex: {
    title: () => 'Dein biologisches Geschlecht',
    help: 'Wird nur für die Berechnung des Grundumsatzes benötigt.',
  },
  height: {
    title: () => 'Wie groß bist du?',
    help: 'In Zentimetern, z. B. 175.',
  },
  weight: {
    title: () => 'Was wiegst du aktuell?',
    help: 'Am besten morgens nüchtern gewogen. Komma ist erlaubt, z. B. 72,5.',
  },
  goal: {
    title: (n) => `Was ist dein Ziel, ${n}?`,
  },
  targetWeight: {
    title: () => 'Welches Gewicht möchtest du erreichen?',
    help: 'Ein realistisches Zwischenziel motiviert mehr als ein fernes Endziel.',
  },
  activityLevel: {
    title: () => 'Wie aktiv bist du im Alltag?',
    help: 'Der Aktivitätsfaktor bestimmt, wie viele Kalorien du insgesamt verbrauchst.',
  },
  pace: {
    title: () => 'In welchem Tempo?',
    help: 'Je schneller, desto größer die tägliche Abweichung vom Bedarf.',
  },
  dietStyle: {
    title: () => 'Wie ernährst du dich?',
    help: 'Bestimmt die Verteilung von Kohlenhydraten, Eiweiß und Fett.',
  },
  notes: {
    title: () => 'Gibt es etwas zu beachten?',
    help: 'Optional. Gemiedene Lebensmittel werden später beim Erfassen markiert.',
  },
};
