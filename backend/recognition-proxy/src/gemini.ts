/**
 * Anbieter: Google Gemini API (kostenlose Stufe möglich).
 * REST: POST /v1beta/models/{model}:generateContent mit strukturierter JSON-Ausgabe.
 */
import { RECOGNITION_PROMPT, sanitizeRecognition, type RecognitionResponse } from '../../../src/domain/recognition';

export class UpstreamError extends Error {
  constructor(
    message: string,
    readonly kind: 'quota' | 'upstream',
  ) {
    super(message);
    this.name = 'UpstreamError';
  }
}

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/';

/** Erzwingt das JSON-Format bereits auf Modellseite (zusätzlich zur Bereinigung danach). */
const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    items: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING' },
          geschaetzteMenge_g: { type: 'NUMBER' },
          kcal: { type: 'NUMBER' },
          kohlenhydrate_g: { type: 'NUMBER' },
          eiweiss_g: { type: 'NUMBER' },
          fett_g: { type: 'NUMBER' },
          konfidenz: { type: 'NUMBER' },
        },
        required: ['name', 'geschaetzteMenge_g', 'kcal', 'kohlenhydrate_g', 'eiweiss_g', 'fett_g', 'konfidenz'],
      },
    },
  },
  required: ['items'],
};

/** Entfernt ggf. Markdown-Codeblöcke um das JSON. */
export function extractJson(text: string): unknown {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  return JSON.parse(cleaned);
}

export async function recognizeWithGemini(
  image: { base64: string; mimeType: string },
  config: { apiKey: string; model: string },
  fetchFn: typeof fetch,
): Promise<RecognitionResponse> {
  const res = await fetchFn(`${API_BASE}${encodeURIComponent(config.model)}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': config.apiKey },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: RECOGNITION_PROMPT }, { inlineData: { mimeType: image.mimeType, data: image.base64 } }],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA,
      },
    }),
  });

  if (res.status === 429) throw new UpstreamError('Kontingent der kostenlosen Stufe erschöpft', 'quota');
  if (!res.ok) throw new UpstreamError(`Gemini antwortete mit HTTP ${res.status}`, 'upstream');

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
  if (!text) return { items: [] }; // z. B. durch Sicherheitsfilter blockiert
  try {
    return sanitizeRecognition(extractJson(text));
  } catch {
    throw new UpstreamError('Antwort des Modells war kein gültiges JSON', 'upstream');
  }
}
