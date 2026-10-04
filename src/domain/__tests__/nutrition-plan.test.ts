import {
  calculateBmr,
  calculateMacros,
  calculatePlan,
  calculateTdee,
  estimateWeeksToTarget,
  kcalAdjustment,
  macroPercentages,
  proteinReferenceWeight,
  type PlanInput,
} from '../nutrition-plan';

const man: PlanInput = {
  sex: 'male',
  ageYears: 30,
  heightCm: 180,
  weightKg: 80,
  goal: 'lose',
  targetWeightKg: 75,
  activityLevel: 'moderate',
  pace: 'steady',
  dietStyle: 'none',
};

const woman: PlanInput = {
  sex: 'female',
  ageYears: 25,
  heightCm: 165,
  weightKg: 60,
  goal: 'maintain',
  targetWeightKg: null,
  activityLevel: 'sedentary',
  pace: null,
  dietStyle: 'none',
};

describe('Grundumsatz (Mifflin-St Jeor)', () => {
  it('Männer: 10·kg + 6,25·cm − 5·Alter + 5', () => {
    // 800 + 1125 − 150 + 5
    expect(calculateBmr('male', 80, 180, 30)).toBe(1780);
  });

  it('Frauen: 10·kg + 6,25·cm − 5·Alter − 161 (gerundet)', () => {
    // 600 + 1031,25 − 125 − 161 = 1345,25
    expect(calculateBmr('female', 60, 165, 25)).toBe(1345);
  });
});

describe('Gesamtumsatz', () => {
  it.each([
    ['sedentary', 2136],
    ['light', 2448],
    ['moderate', 2759],
    ['very', 3071],
    ['athlete', 3382],
  ] as const)('Aktivitätslevel %s', (level, expected) => {
    expect(calculateTdee(1780, level)).toBe(expected);
  });
});

describe('Kalorienanpassung', () => {
  it.each([
    ['lose', 'gentle', -300],
    ['lose', 'steady', -500],
    ['lose', 'aggressive', -750],
    ['gain', 'gentle', 200],
    ['gain', 'steady', 300],
    ['gain', 'aggressive', 500],
  ] as const)('%s / %s → %i kcal', (goal, pace, delta) => {
    expect(kcalAdjustment(goal, pace)).toBe(delta);
  });

  it('halten → 0 kcal', () => {
    expect(kcalAdjustment('maintain', null)).toBe(0);
  });
});

describe('Untergrenze', () => {
  it('greift beim BMR, wenn dieser über der geschlechtsspezifischen Grenze liegt', () => {
    const plan = calculatePlan({ ...woman, goal: 'lose', targetWeightKg: 55, pace: 'aggressive' });
    // TDEE 1614 − 750 = 864 < BMR 1345
    expect(plan.kcalBeforeFloor).toBe(864);
    expect(plan.kcalTarget).toBe(1345);
    expect(plan.floorApplied).toBe(true);
    expect(plan.floorReason).toBe('bmr');
  });

  it('greift bei 1.200 kcal für Frauen, wenn der BMR darunter liegt', () => {
    const plan = calculatePlan({
      ...woman,
      ageYears: 70,
      heightCm: 150,
      weightKg: 45,
      goal: 'lose',
      targetWeightKg: 43,
      pace: 'steady',
    });
    // BMR = 450 + 937,5 − 350 − 161 = 876,5 → 877; TDEE 1052; Ziel 552
    expect(plan.bmr).toBe(877);
    expect(plan.kcalTarget).toBe(1200);
    expect(plan.floorReason).toBe('minimum');
  });

  it('greift bei 1.500 kcal für Männer', () => {
    const plan = calculatePlan({
      ...man,
      ageYears: 80,
      heightCm: 160,
      weightKg: 55,
      targetWeightKg: 53,
      activityLevel: 'sedentary',
      pace: 'aggressive',
    });
    expect(plan.kcalTarget).toBe(1500);
    expect(plan.floorApplied).toBe(true);
  });

  it('greift nicht bei normalem Defizit', () => {
    const plan = calculatePlan(man);
    expect(plan.floorApplied).toBe(false);
    expect(plan.floorReason).toBeNull();
  });
});

describe('Vollständiger Plan', () => {
  it('Beispiel Mann, abnehmen, stetig, keine Präferenz', () => {
    const plan = calculatePlan(man);
    expect(plan).toMatchObject({
      bmr: 1780,
      tdee: 2759,
      kcalTarget: 2259,
      proteinG: 128, // 1,6 × 80
      fatG: 75, // 30 % von 2259 / 9 = 75,3
      carbsG: 268, // (2259 − 512 − 675) / 4
      proteinPct: 23,
      fatPct: 30,
      carbsPct: 47,
      dailyKcalDelta: -500,
      estimatedWeeksToTarget: 11, // 5 kg × 7700 / 500 = 77 Tage
    });
  });

  it('halten: Kalorienziel = TDEE, keine Dauer', () => {
    const plan = calculatePlan(woman);
    expect(plan.kcalTarget).toBe(plan.tdee);
    expect(plan.estimatedWeeksToTarget).toBeNull();
  });

  it('zunehmen: positive Bilanz und Dauer', () => {
    const plan = calculatePlan({ ...man, goal: 'gain', targetWeightKg: 84, pace: 'gentle' });
    expect(plan.kcalTarget).toBe(2959);
    // 4 kg × 7700 / 200 = 154 Tage = 22 Wochen
    expect(plan.estimatedWeeksToTarget).toBe(22);
  });

  it('Makros summieren sich (bis auf Rundung) zum Kalorienziel', () => {
    for (const dietStyle of ['none', 'high_protein', 'low_carb', 'keto', 'vegetarian', 'vegan'] as const) {
      const plan = calculatePlan({ ...man, dietStyle });
      const kcal = plan.carbsG * 4 + plan.proteinG * 4 + plan.fatG * 9;
      expect(Math.abs(kcal - plan.kcalTarget)).toBeLessThanOrEqual(9);
      expect(plan.carbsPct + plan.proteinPct + plan.fatPct).toBeGreaterThanOrEqual(99);
      expect(plan.carbsPct + plan.proteinPct + plan.fatPct).toBeLessThanOrEqual(101);
    }
  });
});

describe('Makroverteilung nach Ernährungsstil (2000 kcal, 70 kg)', () => {
  it('keine Präferenz: 1,6 g/kg Eiweiß, 30 % Fett, Rest Kohlenhydrate', () => {
    expect(calculateMacros(2000, 'none', 70)).toEqual({
      proteinG: 112,
      fatG: 67, // 600 / 9 = 66,7
      carbsG: 237, // (2000 − 448 − 603) / 4 = 237,25
      macroConflict: false,
    });
  });

  it('proteinreich: 2,2 g/kg, 25 % Fett', () => {
    expect(calculateMacros(2000, 'high_protein', 70)).toEqual({
      proteinG: 154,
      fatG: 56, // 500 / 9 = 55,6
      carbsG: 220, // (2000 − 616 − 504) / 4
      macroConflict: false,
    });
  });

  it('low carb: 1,8 g/kg, 20 % Kohlenhydrate, Rest Fett', () => {
    expect(calculateMacros(2000, 'low_carb', 70)).toEqual({
      proteinG: 126,
      carbsG: 100, // 400 / 4
      fatG: 122, // (2000 − 504 − 400) / 9 = 121,8
      macroConflict: false,
    });
  });

  it('keto: 30 g Kohlenhydrate, 1,6 g/kg, Rest Fett', () => {
    expect(calculateMacros(2000, 'keto', 70)).toEqual({
      proteinG: 112,
      carbsG: 30,
      fatG: 159, // (2000 − 448 − 120) / 9 = 159,1
      macroConflict: false,
    });
  });

  it('vegetarisch: 1,8 g/kg, sonst wie keine Präferenz', () => {
    expect(calculateMacros(2000, 'vegetarian', 70)).toMatchObject({ proteinG: 126, fatG: 67 });
  });

  it('vegan: 2,0 g/kg, sonst wie keine Präferenz', () => {
    expect(calculateMacros(2000, 'vegan', 70)).toMatchObject({ proteinG: 140, fatG: 67 });
  });

  it('begrenzt den Rest auf 0 g und meldet einen Konflikt', () => {
    const macros = calculateMacros(1200, 'high_protein', 150);
    expect(macros.carbsG).toBe(0);
    expect(macros.macroConflict).toBe(true);
  });
});

describe('Eiweiß-Referenzgewicht', () => {
  it('nutzt das aktuelle Gewicht bei BMI ≤ 30', () => {
    expect(proteinReferenceWeight({ weightKg: 80, heightCm: 180, goal: 'lose', targetWeightKg: 75 })).toBe(80);
  });

  it('nutzt das Zielgewicht bei BMI > 30', () => {
    // BMI 110 / 1,8² = 33,9
    expect(proteinReferenceWeight({ weightKg: 110, heightCm: 180, goal: 'lose', targetWeightKg: 90 })).toBe(90);
  });

  it('nutzt das Gewicht bei BMI 25, wenn bei BMI > 30 kein Zielgewicht existiert (halten)', () => {
    // 25 × 1,8² = 81
    expect(proteinReferenceWeight({ weightKg: 110, heightCm: 180, goal: 'maintain', targetWeightKg: null })).toBe(81);
    const plan = calculatePlan({ ...man, weightKg: 110, goal: 'maintain', targetWeightKg: null, pace: null });
    expect(plan.proteinG).toBe(130); // 1,6 × 81 = 129,6
  });
});

describe('Hilfsfunktionen', () => {
  it('Prozentanteile aus Grammwerten', () => {
    expect(macroPercentages({ carbsG: 250, proteinG: 125, fatG: 55.6 })).toEqual({
      carbsPct: 50,
      proteinPct: 25,
      fatPct: 25,
    });
  });

  it('Prozentanteile bei 0 kcal', () => {
    expect(macroPercentages({ carbsG: 0, proteinG: 0, fatG: 0 })).toEqual({ carbsPct: 0, proteinPct: 0, fatPct: 0 });
  });

  it('Dauer bis Zielgewicht: 7.700 kcal pro kg', () => {
    expect(estimateWeeksToTarget(80, 70, -500)).toBe(22); // 154 Tage
    expect(estimateWeeksToTarget(80, 70, 0)).toBeNull();
    expect(estimateWeeksToTarget(80, 70, 300)).toBeNull(); // falsche Richtung
    expect(estimateWeeksToTarget(80, 79.9, -750)).toBe(1); // mindestens 1 Woche
  });
});
