/**
 * Vertrag der Foto-Erkennung (Antwort des Backend-Proxys) und dessen Bereinigung.
 *
 * Format (vom Proxy erzwungen, von der App erneut geprüft):
 *   { "items": [{ "name", "geschaetzteMenge_g", "kcal", "kohlenhydrate_g",
 *                 "eiweiss_g", "fett_g", "konfidenz" }] }
 * Nährwerte beziehen sich auf die geschätzte Menge (nicht auf 100 g).
 *
 * Diese Datei ist bewusst abhängigkeitsfrei, weil sie auch vom Cloudflare Worker importiert wird.
 */

export interface RecognitionItem {
  name: string;
  geschaetzteMenge_g: number;
  kcal: number;
  kohlenhydrate_g: number;
  eiweiss_g: number;
  fett_g: number;
  /** 0 (unsicher) bis 1 (sicher). */
  konfidenz: number;
}

export interface RecognitionResponse {
  items: RecognitionItem[];
}

/** Unterhalb dieser Konfidenz wird ein Vorschlag deutlich als Schätzung gekennzeichnet. */
export const LOW_CONFIDENCE = 0.6;
export const MAX_ITEMS = 10;

function toNumber(value: unknown): number | null {
  const n = typeof value === 'string' ? Number(value.replace(',', '.')) : value;
  return typeof n === 'number' && Number.isFinite(n) ? n : null;
}

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Prüft und bereinigt eine (möglicherweise fehlerhafte) Modellantwort.
 * Ungültige Einträge werden verworfen; nie wirft die Funktion.
 */
export function sanitizeRecognition(raw: unknown): RecognitionResponse {
  const list = (raw as { items?: unknown } | null)?.items;
  if (!Array.isArray(list)) return { items: [] };

  const items: RecognitionItem[] = [];
  for (const entry of list) {
    if (items.length >= MAX_ITEMS) break;
    const e = entry as Record<string, unknown> | null;
    if (!e || typeof e !== 'object') continue;

    const name = typeof e.name === 'string' ? e.name.trim().slice(0, 80) : '';
    const grams = toNumber(e.geschaetzteMenge_g);
    const kcal = toNumber(e.kcal);
    const carbs = toNumber(e.kohlenhydrate_g);
    const protein = toNumber(e.eiweiss_g);
    const fat = toNumber(e.fett_g);
    const confidence = toNumber(e.konfidenz);

    if (!name || grams == null || grams < 1 || grams > 3000) continue;
    if (kcal == null || carbs == null || protein == null || fat == null) continue;
    if (kcal < 0 || carbs < 0 || protein < 0 || fat < 0) continue;
    // Energiedichte > 9 kcal/g bzw. Makros > Gewicht sind physikalisch unmöglich.
    if (kcal > grams * 9.5 || carbs + protein + fat > grams * 1.05) continue;

    items.push({
      name,
      geschaetzteMenge_g: Math.round(grams),
      kcal: Math.round(kcal),
      kohlenhydrate_g: round1(carbs),
      eiweiss_g: round1(protein),
      fett_g: round1(fat),
      // Fehlende Konfidenz gilt als unsicher; Prozentangaben (0–100) werden umgerechnet.
      konfidenz: confidence == null ? 0 : Math.round(clamp(confidence > 1 ? confidence / 100 : confidence, 0, 1) * 100) / 100,
    });
  }
  return { items };
}

export function isLowConfidence(item: Pick<RecognitionItem, 'konfidenz'>): boolean {
  return item.konfidenz < LOW_CONFIDENCE;
}

export function confidenceLabel(konfidenz: number): 'hoch' | 'mittel' | 'niedrig' {
  if (konfidenz >= 0.8) return 'hoch';
  if (konfidenz >= LOW_CONFIDENCE) return 'mittel';
  return 'niedrig';
}

/** Nährwerte pro 100 g aus der Schätzung – Grundlage für die Umrechnung bei geänderter Menge. */
export function itemPer100g(item: RecognitionItem): { kcal: number; carbsG: number; proteinG: number; fatG: number } {
  const f = 100 / item.geschaetzteMenge_g;
  return {
    kcal: item.kcal * f,
    carbsG: item.kohlenhydrate_g * f,
    proteinG: item.eiweiss_g * f,
    fatG: item.fett_g * f,
  };
}

/** Anweisung an das Modell (deutsch, strikt JSON). */
export const RECOGNITION_PROMPT = `Du bist Ernährungsexperte. Analysiere das Foto einer Mahlzeit.
Erkenne jedes sichtbare Lebensmittel bzw. jede Komponente separat (z. B. Reis, Hähnchen, Soße getrennt).
Schätze für jede Komponente die Menge in Gramm anhand von Tellergröße, Besteck und üblichen Portionen.
Gib die Nährwerte für GENAU diese geschätzte Menge an (nicht pro 100 g).
Verwende deutsche, allgemein verständliche Bezeichnungen.
"konfidenz" (0 bis 1) drückt aus, wie sicher Erkennung UND Mengenschätzung sind; sei vorsichtig und ehrlich.
Ist kein Essen erkennbar, gib {"items": []} zurück.
Antworte ausschließlich mit JSON in diesem Format:
{"items":[{"name":"string","geschaetzteMenge_g":0,"kcal":0,"kohlenhydrate_g":0,"eiweiss_g":0,"fett_g":0,"konfidenz":0}]}`;
