import {
  draftToProfile,
  EMPTY_DRAFT,
  nextStep,
  parseAvoidFoods,
  parseDecimal,
  previousStep,
  profileToDraft,
  progressOf,
  validateStep,
  visibleSteps,
  type OnboardingDraft,
} from '../onboarding';

const complete: OnboardingDraft = {
  firstName: '  Alex ',
  age: '30',
  sex: 'male',
  height: '180',
  weight: '82,5',
  goal: 'lose',
  targetWeight: '75',
  activityLevel: 'moderate',
  pace: 'steady',
  dietStyle: 'high_protein',
  avoidFoods: 'Erdnüsse, Laktose; erdnüsse\n Sellerie ',
  healthNote: '',
};

describe('Schrittfolge', () => {
  it('zeigt alle 11 Fragen bei Ab-/Zunahme', () => {
    expect(visibleSteps({ goal: 'lose' })).toHaveLength(11);
    expect(visibleSteps({ goal: null })).toHaveLength(11);
  });

  it('überspringt Zielgewicht und Tempo bei „halten"', () => {
    const steps = visibleSteps({ goal: 'maintain' });
    expect(steps).toHaveLength(9);
    expect(steps).not.toContain('targetWeight');
    expect(steps).not.toContain('pace');
    const draft = { ...complete, goal: 'maintain' as const };
    expect(nextStep('goal', draft)).toBe('activityLevel');
    expect(nextStep('activityLevel', draft)).toBe('dietStyle');
    expect(previousStep('dietStyle', draft)).toBe('activityLevel');
  });

  it('hat keinen Vorgänger für Frage 1 und keinen Nachfolger für Frage 11', () => {
    expect(previousStep('firstName', complete)).toBeNull();
    expect(nextStep('notes', complete)).toBeNull();
  });

  it('berechnet den Fortschritt relativ zu den sichtbaren Schritten', () => {
    expect(progressOf('firstName', complete)).toBeCloseTo(1 / 11);
    expect(progressOf('notes', complete)).toBe(1);
    expect(progressOf('notes', { ...complete, goal: 'maintain' })).toBe(1);
  });
});

describe('Validierung', () => {
  it('Vorname ist Pflicht', () => {
    expect(validateStep('firstName', { ...EMPTY_DRAFT, firstName: '   ' })).toMatch(/Vornamen/);
    expect(validateStep('firstName', { ...EMPTY_DRAFT, firstName: 'A' })).toBeNull();
  });

  it('Alter: ganze Zahl von 18 bis 100', () => {
    expect(validateStep('age', { ...EMPTY_DRAFT, age: 'abc' })).toMatch(/Zahl/);
    expect(validateStep('age', { ...EMPTY_DRAFT, age: '30,5' })).toMatch(/ganzen Jahren/);
    expect(validateStep('age', { ...EMPTY_DRAFT, age: '16' })).toMatch(/ab 18/);
    expect(validateStep('age', { ...EMPTY_DRAFT, age: '101' })).toMatch(/zwischen/);
    expect(validateStep('age', { ...EMPTY_DRAFT, age: '45' })).toBeNull();
  });

  it('Größe und Gewicht in plausiblen Grenzen, Komma erlaubt', () => {
    expect(validateStep('height', { ...EMPTY_DRAFT, height: '18' })).toMatch(/zwischen 120 und 230/);
    expect(validateStep('height', { ...EMPTY_DRAFT, height: '172,5' })).toBeNull();
    expect(validateStep('weight', { ...EMPTY_DRAFT, weight: '' })).toMatch(/Zahl/);
    expect(validateStep('weight', { ...EMPTY_DRAFT, weight: '70.2' })).toBeNull();
  });

  it('Zielgewicht muss zur Zielrichtung passen', () => {
    expect(validateStep('targetWeight', { ...complete, targetWeight: '90' })).toMatch(/unter deinem/);
    expect(validateStep('targetWeight', { ...complete, goal: 'gain', targetWeight: '80' })).toMatch(/über deinem/);
    expect(validateStep('targetWeight', complete)).toBeNull();
  });

  it('Zielgewicht beim Abnehmen nicht im Untergewicht', () => {
    // 18,5 × 1,8² = 59,94 → mindestens 60 kg
    expect(validateStep('targetWeight', { ...complete, targetWeight: '55' })).toMatch(/mindestens 60 kg/);
  });

  it('Auswahlfragen verlangen eine Auswahl', () => {
    for (const step of ['sex', 'goal', 'activityLevel', 'pace', 'dietStyle'] as const) {
      expect(validateStep(step, EMPTY_DRAFT)).not.toBeNull();
    }
  });

  it('Notizen sind optional', () => {
    expect(validateStep('notes', EMPTY_DRAFT)).toBeNull();
  });
});

describe('Umwandlung in ein Profil', () => {
  it('liefert ein bereinigtes Profil', () => {
    const result = draftToProfile(complete);
    expect(result).toEqual({
      ok: true,
      profile: {
        firstName: 'Alex',
        ageYears: 30,
        sex: 'male',
        heightCm: 180,
        weightKg: 82.5,
        goal: 'lose',
        targetWeightKg: 75,
        activityLevel: 'moderate',
        pace: 'steady',
        dietStyle: 'high_protein',
        avoidFoods: ['Erdnüsse', 'Laktose', 'Sellerie'],
        healthNote: null,
      },
    });
  });

  it('verwirft Zielgewicht und Tempo bei „halten"', () => {
    const result = draftToProfile({ ...complete, goal: 'maintain', targetWeight: 'xyz', pace: null });
    expect(result.ok && result.profile.targetWeightKg).toBeNull();
    expect(result.ok && result.profile.pace).toBeNull();
  });

  it('meldet den ersten ungültigen Schritt', () => {
    expect(draftToProfile({ ...complete, height: '' })).toMatchObject({ ok: false, step: 'height' });
  });

  it('ist mit profileToDraft umkehrbar', () => {
    const result = draftToProfile(complete);
    if (!result.ok) throw new Error('unerwartet');
    expect(draftToProfile(profileToDraft(result.profile))).toEqual(result);
  });
});

describe('Parser', () => {
  it('parseDecimal', () => {
    expect(parseDecimal('72,5')).toBe(72.5);
    expect(parseDecimal(' 80 ')).toBe(80);
    expect(parseDecimal('-5')).toBeNull();
    expect(parseDecimal('1e3')).toBeNull();
    expect(parseDecimal('')).toBeNull();
  });

  it('parseAvoidFoods entfernt Duplikate unabhängig von Groß-/Kleinschreibung', () => {
    expect(parseAvoidFoods('Erdnüsse, Laktose; erdnüsse\n Sellerie ')).toEqual(['Erdnüsse', 'Laktose', 'Sellerie']);
    expect(parseAvoidFoods('  ,, ')).toEqual([]);
  });
});
