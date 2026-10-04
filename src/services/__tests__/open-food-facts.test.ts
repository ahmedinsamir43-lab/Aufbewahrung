/**
 * @jest-environment node
 *
 * Fixtures im Format der Open-Food-Facts-API v2 (gekürzt).
 */
import { lookupBarcode, mapOffProduct, OffNetworkError, searchProducts, type OffProductRaw } from '../open-food-facts';

const nutella: OffProductRaw = {
  code: '3017624010701',
  product_name: 'Nutella',
  product_name_de: 'Nutella Nuss-Nougat-Creme',
  brands: 'Ferrero, Nutella',
  nutriments: {
    'energy-kcal_100g': 539,
    'energy-kj_100g': 2252,
    carbohydrates_100g: 57.5,
    proteins_100g: 6.3,
    fat_100g: 30.9,
  },
  serving_quantity: '15',
  serving_quantity_unit: 'g',
  ingredients_text_de: 'Zucker, Palmöl, Haselnüsse 13 %, Magermilchpulver 8,7 %, fettarmer Kakao 7,4 %',
  allergens_tags: ['en:milk', 'en:nuts'],
  traces_tags: ['en:peanuts'],
};

function fakeFetch(status: number, body: unknown) {
  const calls: string[] = [];
  const fn = async (url: string) => {
    calls.push(url);
    return { ok: status < 400, status, json: async () => body };
  };
  return Object.assign(fn, { calls });
}

describe('mapOffProduct', () => {
  it('übernimmt Name (deutsch bevorzugt), erste Marke, Nährwerte und Portion', () => {
    const r = mapOffProduct(nutella, '3017624010701');
    expect(r).toEqual({
      kind: 'complete',
      product: {
        barcode: '3017624010701',
        name: 'Nutella Nuss-Nougat-Creme',
        brand: 'Ferrero',
        per100g: { kcal: 539, carbsG: 57.5, proteinG: 6.3, fatG: 30.9 },
        defaultPortionG: 15,
        ingredientsText:
          'Zucker, Palmöl, Haselnüsse 13 %, Magermilchpulver 8,7 %, fettarmer Kakao 7,4 % | Allergene/Spuren: Milch, Laktose, Schalenfrüchte, Nüsse, Erdnüsse',
      },
    });
  });

  it('rechnet kJ in kcal um, wenn kcal fehlt', () => {
    const r = mapOffProduct({ ...nutella, nutriments: { ...nutella.nutriments, 'energy-kcal_100g': undefined } }, 'x');
    expect(r.kind === 'complete' && r.product.per100g.kcal).toBe(538); // 2252 / 4,184
  });

  it('schätzt kcal nach Atwater, wenn gar keine Energieangabe vorliegt', () => {
    const r = mapOffProduct(
      { product_name: 'Test', nutriments: { carbohydrates_100g: 10, proteins_100g: 10, fat_100g: 10 } },
      'x',
    );
    expect(r.kind === 'complete' && r.product.per100g.kcal).toBe(170);
  });

  it('akzeptiert Zahlen als Zeichenketten', () => {
    const r = mapOffProduct(
      { product_name: 'Test', nutriments: { 'energy-kcal_100g': '100', carbohydrates_100g: '5,5', proteins_100g: '3', fat_100g: '1' } },
      'x',
    );
    expect(r.kind === 'complete' && r.product.per100g).toEqual({ kcal: 100, carbsG: 5.5, proteinG: 3, fatG: 1 });
  });

  it('meldet unvollständige Nährwerte', () => {
    expect(mapOffProduct({ product_name: 'Cola', nutriments: { 'energy-kcal_100g': 42 } }, '1')).toEqual({
      kind: 'incomplete',
      barcode: '1',
      name: 'Cola',
      brand: null,
    });
    expect(mapOffProduct({ nutriments: nutella.nutriments }, '1').kind).toBe('incomplete');
  });

  it('verwirft unplausible Werte', () => {
    const r = mapOffProduct({ ...nutella, nutriments: { ...nutella.nutriments, fat_100g: 309 } }, '1');
    expect(r.kind).toBe('incomplete');
  });

  it('ignoriert Portionsangaben in ml oder außerhalb der Grenzen', () => {
    const ml = mapOffProduct({ ...nutella, serving_quantity: 250, serving_quantity_unit: 'ml' }, '1');
    expect(ml.kind === 'complete' && ml.product.defaultPortionG).toBeNull();
    const zero = mapOffProduct({ ...nutella, serving_quantity: 0 }, '1');
    expect(zero.kind === 'complete' && zero.product.defaultPortionG).toBeNull();
  });
});

describe('lookupBarcode', () => {
  it('liefert ein gefundenes Produkt', async () => {
    const f = fakeFetch(200, { status: 1, product: nutella });
    const r = await lookupBarcode('3017624010701', f);
    expect(r.kind).toBe('complete');
    expect(f.calls[0]).toMatch(/\/api\/v2\/product\/3017624010701\.json\?fields=/);
  });

  it('erkennt „nicht gefunden" (HTTP 404 und status 0)', async () => {
    await expect(lookupBarcode('1', fakeFetch(404, { status: 0 }))).resolves.toEqual({ kind: 'not_found', barcode: '1' });
    await expect(lookupBarcode('1', fakeFetch(200, { status: 0 }))).resolves.toEqual({ kind: 'not_found', barcode: '1' });
  });

  it('wirft OffNetworkError bei Verbindungsfehler und Serverfehlern', async () => {
    const offline = async () => {
      throw new TypeError('Network request failed');
    };
    await expect(lookupBarcode('1', offline)).rejects.toBeInstanceOf(OffNetworkError);
    await expect(lookupBarcode('1', fakeFetch(503, null))).rejects.toBeInstanceOf(OffNetworkError);
    await expect(lookupBarcode('1', fakeFetch(429, null))).rejects.toBeInstanceOf(OffNetworkError);
  });
});

describe('searchProducts', () => {
  it('liefert nur vollständige, eindeutige Produkte', async () => {
    const f = fakeFetch(200, {
      products: [nutella, nutella, { code: '2', product_name: 'Ohne Nährwerte' }, { product_name: 'Ohne Code' }],
    });
    const r = await searchProducts('nutella', f);
    expect(r.map((p) => p.barcode)).toEqual(['3017624010701']);
    expect(f.calls[0]).toMatch(/search_terms=nutella/);
  });

  it('sucht erst ab 2 Zeichen', async () => {
    const f = fakeFetch(200, { products: [] });
    await expect(searchProducts(' a ', f)).resolves.toEqual([]);
    expect(f.calls).toHaveLength(0);
  });
});
