import { dayTotals, kcalBalance, parsePortion, scaleNutrients, sumNutrients } from '../portion';

const oats = { kcal: 372, carbsG: 58.7, proteinG: 13.5, fatG: 7 };

describe('Portionsumrechnung', () => {
  it('rechnet pro 100 g auf die Portion um', () => {
    const n = scaleNutrients(oats, 60);
    expect(n.kcal).toBeCloseTo(223.2);
    expect(n.carbsG).toBeCloseTo(35.22);
    expect(n.proteinG).toBeCloseTo(8.1);
    expect(n.fatG).toBeCloseTo(4.2);
  });

  it('liefert 0 bei 0 g oder negativer Menge', () => {
    expect(scaleNutrients(oats, 0).kcal).toBe(0);
    expect(scaleNutrients(oats, -10).kcal).toBe(0);
  });

  it('ist linear', () => {
    expect(scaleNutrients(oats, 250).kcal).toBeCloseTo(scaleNutrients(oats, 100).kcal * 2.5);
  });
});

describe('Tagessummen', () => {
  it('summiert gesamt und je Mahlzeit', () => {
    const totals = dayTotals([
      { meal: 'breakfast', kcal: 200, carbsG: 30, proteinG: 10, fatG: 5 },
      { meal: 'breakfast', kcal: 100, carbsG: 10, proteinG: 5, fatG: 3 },
      { meal: 'dinner', kcal: 500, carbsG: 40, proteinG: 35, fatG: 20 },
    ]);
    expect(totals.total).toEqual({ kcal: 800, carbsG: 80, proteinG: 50, fatG: 28 });
    expect(totals.byMeal.breakfast.kcal).toBe(300);
    expect(totals.byMeal.lunch.kcal).toBe(0);
    expect(totals.byMeal.dinner.proteinG).toBe(35);
  });

  it('leere Liste ergibt 0', () => {
    expect(sumNutrients([])).toEqual({ kcal: 0, carbsG: 0, proteinG: 0, fatG: 0 });
  });
});

describe('Kalorienbilanz', () => {
  it('verbleibend', () => {
    expect(kcalBalance(800, 2000)).toEqual({ remaining: 1200, over: 0, fraction: 0.4 });
  });

  it('Überschreitung', () => {
    expect(kcalBalance(2250.4, 2000)).toEqual({ remaining: 0, over: 250, fraction: 1 });
  });

  it('Ziel 0', () => {
    expect(kcalBalance(100, 0).fraction).toBe(0);
  });
});

describe('parsePortion', () => {
  it.each([
    ['150', 150],
    ['72,5', 72.5],
    [' 30 ', 30],
    ['0', null],
    ['5001', null],
    ['abc', null],
    ['', null],
  ])('%s → %s', (raw, expected) => {
    expect(parsePortion(raw)).toBe(expected);
  });
});
