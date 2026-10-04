import { confidenceLabel, isLowConfidence, itemPer100g, MAX_ITEMS, sanitizeRecognition } from '../recognition';

const rice = {
  name: 'Basmatireis, gekocht',
  geschaetzteMenge_g: 180,
  kcal: 234,
  kohlenhydrate_g: 51.5,
  eiweiss_g: 4.9,
  fett_g: 0.5,
  konfidenz: 0.85,
};

describe('sanitizeRecognition', () => {
  it('übernimmt gültige Einträge', () => {
    expect(sanitizeRecognition({ items: [rice] })).toEqual({ items: [rice] });
  });

  it('liefert eine leere Liste bei unbrauchbarer Antwort', () => {
    for (const raw of [null, undefined, 'text', 42, {}, { items: 'x' }]) {
      expect(sanitizeRecognition(raw)).toEqual({ items: [] });
    }
  });

  it('verwirft unvollständige und unmögliche Einträge', () => {
    const r = sanitizeRecognition({
      items: [
        { ...rice, name: '' },
        { ...rice, kcal: undefined },
        { ...rice, geschaetzteMenge_g: 0 },
        { ...rice, fett_g: -1 },
        { ...rice, geschaetzteMenge_g: 10, kcal: 500 }, // > 9,5 kcal/g
        { ...rice, geschaetzteMenge_g: 10, kohlenhydrate_g: 20 }, // Makros > Gewicht
        'kein Objekt',
        rice,
      ],
    });
    expect(r.items).toEqual([rice]);
  });

  it('wandelt Zeichenketten und Prozent-Konfidenz um, rundet und kürzt', () => {
    const r = sanitizeRecognition({
      items: [{ ...rice, name: `  ${'x'.repeat(100)} `, geschaetzteMenge_g: '180,4', kcal: '234.4', konfidenz: 70 }],
    });
    expect(r.items[0]).toMatchObject({ geschaetzteMenge_g: 180, kcal: 234, konfidenz: 0.7 });
    expect(r.items[0].name).toHaveLength(80);
  });

  it('setzt fehlende Konfidenz auf 0 und begrenzt auf 0–1', () => {
    expect(sanitizeRecognition({ items: [{ ...rice, konfidenz: undefined }] }).items[0].konfidenz).toBe(0);
    expect(sanitizeRecognition({ items: [{ ...rice, konfidenz: -0.3 }] }).items[0].konfidenz).toBe(0);
    expect(sanitizeRecognition({ items: [{ ...rice, konfidenz: 1 }] }).items[0].konfidenz).toBe(1);
  });

  it(`begrenzt auf ${MAX_ITEMS} Einträge`, () => {
    expect(sanitizeRecognition({ items: Array(15).fill(rice) }).items).toHaveLength(MAX_ITEMS);
  });
});

describe('Konfidenz und Umrechnung', () => {
  it('kennzeichnet niedrige Konfidenz', () => {
    expect(isLowConfidence({ konfidenz: 0.59 })).toBe(true);
    expect(isLowConfidence({ konfidenz: 0.6 })).toBe(false);
    expect(confidenceLabel(0.9)).toBe('hoch');
    expect(confidenceLabel(0.7)).toBe('mittel');
    expect(confidenceLabel(0.3)).toBe('niedrig');
  });

  it('rechnet die Schätzung auf 100 g zurück', () => {
    const per100 = itemPer100g(rice);
    expect(per100.kcal).toBeCloseTo(130);
    expect(per100.carbsG).toBeCloseTo(28.61, 1);
  });
});
