/**
 * Anbindung an Open Food Facts (https://world.openfoodfacts.org, Lizenz ODbL).
 *
 * - Produktabfrage: GET /api/v2/product/{barcode}.json (Nährwerte pro 100 g)
 * - Textsuche:      GET /cgi/search.pl (Rate-Limit 10 Anfragen/Minute → nur auf Nutzeraktion)
 *
 * Das Mapping auf das Datenmodell ist rein funktional und unabhängig vom Netzwerk testbar.
 */
import { atwaterKcal } from '@/domain/food-validation';
import type { Per100g } from '@/domain/types';

const PRODUCT_URL = 'https://world.openfoodfacts.org/api/v2/product/';
const SEARCH_URL = 'https://de.openfoodfacts.org/cgi/search.pl';
const TIMEOUT_MS = 8000;
/** Open Food Facts bittet um einen aussagekräftigen User-Agent. */
const USER_AGENT = 'Naehrwert/1.0 (Android; private Ernaehrungs-App)';

const FIELDS = [
  'code',
  'product_name',
  'product_name_de',
  'generic_name_de',
  'generic_name',
  'brands',
  'nutriments',
  'serving_quantity',
  'serving_quantity_unit',
  'ingredients_text_de',
  'ingredients_text',
  'allergens_tags',
  'traces_tags',
].join(',');

/** Netzwerkfehler (offline, Zeitüberschreitung, Serverfehler) – Scan wird zwischengespeichert. */
export class OffNetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OffNetworkError';
  }
}

export interface OffProductRaw {
  code?: string;
  product_name?: string;
  product_name_de?: string;
  generic_name_de?: string;
  generic_name?: string;
  brands?: string;
  nutriments?: Record<string, number | string | undefined>;
  serving_quantity?: number | string;
  serving_quantity_unit?: string;
  ingredients_text_de?: string;
  ingredients_text?: string;
  allergens_tags?: string[];
  traces_tags?: string[];
}

export interface MappedProduct {
  barcode: string;
  name: string;
  brand: string | null;
  per100g: Per100g;
  defaultPortionG: number | null;
  ingredientsText: string | null;
}

export type MapResult =
  | { kind: 'complete'; product: MappedProduct }
  | { kind: 'incomplete'; barcode: string; name: string | null; brand: string | null };

export type LookupResult =
  | MapResult
  | { kind: 'not_found'; barcode: string };

/** Deutsche Bezeichnungen der EU-Hauptallergene (OFF-Tags) für den Abgleich mit gemiedenen Lebensmitteln. */
const ALLERGENS_DE: Record<string, string> = {
  'en:gluten': 'Gluten, Weizen',
  'en:crustaceans': 'Krebstiere',
  'en:eggs': 'Ei, Eier',
  'en:fish': 'Fisch',
  'en:peanuts': 'Erdnüsse',
  'en:soybeans': 'Soja',
  'en:milk': 'Milch, Laktose',
  'en:nuts': 'Schalenfrüchte, Nüsse',
  'en:celery': 'Sellerie',
  'en:mustard': 'Senf',
  'en:sesame-seeds': 'Sesam',
  'en:sulphur-dioxide-and-sulphites': 'Sulfite',
  'en:lupin': 'Lupinen',
  'en:molluscs': 'Weichtiere',
};

function num(value: unknown): number | null {
  const n = typeof value === 'string' ? Number(value.replace(',', '.')) : value;
  return typeof n === 'number' && Number.isFinite(n) && n >= 0 ? n : null;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

function firstNonEmpty(...values: (string | undefined)[]): string | null {
  for (const v of values) {
    const t = v?.trim();
    if (t) return t;
  }
  return null;
}

/** Wandelt ein OFF-Produkt in das Datenmodell um. Unvollständige Nährwerte → `incomplete`. */
export function mapOffProduct(raw: OffProductRaw, barcode: string): MapResult {
  const name = firstNonEmpty(raw.product_name_de, raw.product_name, raw.generic_name_de, raw.generic_name);
  const brand = firstNonEmpty(raw.brands?.split(',')[0]);
  const n = raw.nutriments ?? {};

  const carbsG = num(n.carbohydrates_100g);
  const proteinG = num(n.proteins_100g);
  const fatG = num(n.fat_100g);
  const kj = num(n['energy-kj_100g']) ?? (n.energy_unit === 'kcal' ? null : num(n.energy_100g));
  let kcal = num(n['energy-kcal_100g']) ?? (kj != null ? kj / 4.184 : null);

  if (!name || carbsG == null || proteinG == null || fatG == null) {
    return { kind: 'incomplete', barcode, name, brand };
  }
  if (kcal == null) kcal = atwaterKcal({ carbsG, proteinG, fatG });

  // Unplausible Datensätze (Tippfehler in der Community-Datenbank) nicht übernehmen.
  if (kcal > 900 || carbsG > 100 || proteinG > 100 || fatG > 100 || carbsG + proteinG + fatG > 105) {
    return { kind: 'incomplete', barcode, name, brand };
  }

  const serving = num(raw.serving_quantity);
  const servingUnit = (raw.serving_quantity_unit ?? 'g').toLowerCase();
  const defaultPortionG = serving != null && serving >= 1 && serving <= 5000 && servingUnit === 'g' ? round1(serving) : null;

  const allergens = [...(raw.allergens_tags ?? []), ...(raw.traces_tags ?? [])]
    .map((t) => ALLERGENS_DE[t])
    .filter(Boolean);
  const ingredients = firstNonEmpty(raw.ingredients_text_de, raw.ingredients_text);
  const ingredientsText =
    [ingredients, allergens.length ? `Allergene/Spuren: ${[...new Set(allergens)].join(', ')}` : null]
      .filter(Boolean)
      .join(' | ') || null;

  return {
    kind: 'complete',
    product: {
      barcode,
      name,
      brand,
      per100g: { kcal: Math.round(kcal), carbsG: round1(carbsG), proteinG: round1(proteinG), fatG: round1(fatG) },
      defaultPortionG,
      ingredientsText,
    },
  };
}

type FetchFn = (input: string, init?: { headers?: Record<string, string>; signal?: AbortSignal }) => Promise<{
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}>;

async function getJson(url: string, fetchFn: FetchFn): Promise<{ status: number; body: unknown }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetchFn(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      signal: controller.signal,
    });
    if (res.status >= 500 || res.status === 429) throw new OffNetworkError(`HTTP ${res.status}`);
    const body = await res.json().catch(() => null);
    return { status: res.status, body };
  } catch (error) {
    if (error instanceof OffNetworkError) throw error;
    throw new OffNetworkError(error instanceof Error ? error.message : 'Netzwerkfehler');
  } finally {
    clearTimeout(timer);
  }
}

/** Fragt ein Produkt per Barcode ab. Wirft `OffNetworkError` bei fehlender Verbindung. */
export async function lookupBarcode(barcode: string, fetchFn: FetchFn = fetch): Promise<LookupResult> {
  const { status, body } = await getJson(`${PRODUCT_URL}${encodeURIComponent(barcode)}.json?fields=${FIELDS}`, fetchFn);
  const data = body as { status?: number; product?: OffProductRaw } | null;
  if (status === 404 || !data || data.status !== 1 || !data.product) return { kind: 'not_found', barcode };
  return mapOffProduct(data.product, barcode);
}

/** Textsuche (deutsche Produkte bevorzugt). Liefert nur Produkte mit vollständigen Nährwerten. */
export async function searchProducts(query: string, fetchFn: FetchFn = fetch): Promise<MappedProduct[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const params = new URLSearchParams({
    search_terms: q,
    search_simple: '1',
    action: 'process',
    json: '1',
    page_size: '25',
    fields: FIELDS,
  });
  const { body } = await getJson(`${SEARCH_URL}?${params.toString()}`, fetchFn);
  const products = (body as { products?: OffProductRaw[] } | null)?.products ?? [];
  const seen = new Set<string>();
  const result: MappedProduct[] = [];
  for (const raw of products) {
    if (!raw.code || seen.has(raw.code)) continue;
    const mapped = mapOffProduct(raw, raw.code);
    if (mapped.kind === 'complete') {
      seen.add(raw.code);
      result.push(mapped.product);
    }
  }
  return result;
}
