import { findAvoidMatches, normalize, stem } from '../avoid-match';
import { EMPTY_FOOD_DRAFT, validateFood } from '../food-validation';
import { isMeal, mealForTime } from '../meals';

describe('Mahlzeit nach Uhrzeit', () => {
  const at = (h: number, m = 0) => new Date(2026, 9, 4, h, m);
  it.each([
    [7, 0, 'breakfast'],
    [10, 29, 'breakfast'],
    [10, 45, 'snack'],
    [12, 30, 'lunch'],
    [16, 0, 'snack'],
    [19, 0, 'dinner'],
    [23, 0, 'snack'],
    [2, 0, 'snack'],
  ] as const)('%i:%i → %s', (h, m, meal) => {
    expect(mealForTime(at(h, m))).toBe(meal);
  });

  it('isMeal', () => {
    expect(isMeal('lunch')).toBe(true);
    expect(isMeal('brunch')).toBe(false);
    expect(isMeal(undefined)).toBe(false);
  });
});

describe('Gemiedene Lebensmittel', () => {
  it('normalisiert Umlaute und ß', () => {
    expect(normalize('Süßkartoffel')).toBe('susskartoffel');
  });

  it('führt Pluralformen auf den Stamm zurück', () => {
    expect(stem('Erdnüsse')).toBe('erdnuss');
    expect(stem('Haselnüsse')).toBe('haselnuss');
    expect(stem('Ei')).toBe('ei');
  });

  it('findet Treffer in Name, Marke und Zutaten', () => {
    expect(findAvoidMatches(['Erdnüsse', 'Laktose'], 'Erdnussbutter Crunchy', null)).toEqual(['Erdnüsse']);
    expect(findAvoidMatches(['Laktose'], 'Müsli', 'Marke', 'Haferflocken, Laktose, Zucker')).toEqual(['Laktose']);
    expect(findAvoidMatches(['Sellerie'], 'Apfel')).toEqual([]);
  });

  it('ignoriert zu kurze Begriffe (Fehlalarme vermeiden)', () => {
    expect(findAvoidMatches(['Ei'], 'Reis mit Gemüse')).toEqual([]);
  });

  it('ohne Text keine Treffer', () => {
    expect(findAvoidMatches(['Erdnüsse'])).toEqual([]);
  });
});

describe('Validierung manueller Lebensmittel', () => {
  const valid = { ...EMPTY_FOOD_DRAFT, name: ' Haferflocken ', kcal: '372', carbs: '58,7', protein: '13,5', fat: '7' };

  it('akzeptiert gültige Werte', () => {
    const r = validateFood(valid);
    expect(r).toEqual({
      ok: true,
      food: {
        name: 'Haferflocken',
        brand: null,
        per100g: { kcal: 372, carbsG: 58.7, proteinG: 13.5, fatG: 7 },
        defaultPortionG: null,
      },
      warning: null,
    });
  });

  it('meldet fehlende Felder', () => {
    const r = validateFood(EMPTY_FOOD_DRAFT);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(['carbs', 'fat', 'kcal', 'name', 'protein']);
  });

  it('weist mehr als 100 g Makros pro 100 g ab', () => {
    const r = validateFood({ ...valid, carbs: '60', protein: '30', fat: '20' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.fat).toMatch(/mehr als 100 g/);
  });

  it('weist unplausible Kalorien ab', () => {
    const r = validateFood({ ...valid, kcal: '950' });
    expect(r.ok).toBe(false);
  });

  it('warnt bei Abweichung zwischen Kalorien und Makros', () => {
    const r = validateFood({ ...valid, kcal: '150' });
    expect(r.ok && r.warning).toMatch(/rechnerisch ca\. 352 kcal/);
  });

  it('prüft die Standardportion', () => {
    expect(validateFood({ ...valid, defaultPortion: '0' }).ok).toBe(false);
    const r = validateFood({ ...valid, defaultPortion: '40' });
    expect(r.ok && r.food.defaultPortionG).toBe(40);
  });
});
