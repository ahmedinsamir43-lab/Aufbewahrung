/**
 * Foto-Erkennung über den eigenen Backend-Proxy (Cloudflare Worker → Gemini).
 *
 * Konfiguration über Umgebungsvariablen (zur Build-Zeit eingebettet), siehe .env.example:
 *   EXPO_PUBLIC_RECOGNITION_URL    z. B. https://naehrwert-recognition.<konto>.workers.dev
 *   EXPO_PUBLIC_RECOGNITION_TOKEN  App-Token (identisch mit APP_TOKEN im Worker)
 * Der eigentliche KI-Schlüssel liegt ausschließlich im Worker.
 */
import { sanitizeRecognition, type RecognitionItem } from '@/domain/recognition';

export type RecognitionResult =
  | { kind: 'ok'; items: RecognitionItem[] }
  | { kind: 'not_configured' }
  | { kind: 'offline' }
  | { kind: 'quota' }
  | { kind: 'error'; message: string };

const TIMEOUT_MS = 45_000;

export interface RecognitionConfig {
  url: string;
  token: string;
}

export function readConfig(env: Record<string, string | undefined> = {
  EXPO_PUBLIC_RECOGNITION_URL: process.env.EXPO_PUBLIC_RECOGNITION_URL,
  EXPO_PUBLIC_RECOGNITION_TOKEN: process.env.EXPO_PUBLIC_RECOGNITION_TOKEN,
}): RecognitionConfig | null {
  const url = env.EXPO_PUBLIC_RECOGNITION_URL?.trim().replace(/\/+$/, '');
  const token = env.EXPO_PUBLIC_RECOGNITION_TOKEN?.trim();
  if (!url || !token || !/^https?:\/\//.test(url)) return null;
  return { url, token };
}

type FetchFn = (
  input: string,
  init: { method: string; headers: Record<string, string>; body: string; signal: AbortSignal },
) => Promise<{ status: number; json(): Promise<unknown> }>;

/** Sendet ein JPEG (Base64) an den Proxy und liefert bereinigte Vorschläge. */
export async function recognizeMeal(
  imageBase64: string,
  config: RecognitionConfig | null = readConfig(),
  fetchFn: FetchFn = fetch,
): Promise<RecognitionResult> {
  if (!config) return { kind: 'not_configured' };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetchFn(`${config.url}/recognize`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${config.token}` },
      body: JSON.stringify({ image: imageBase64, mimeType: 'image/jpeg' }),
      signal: controller.signal,
    });
    if (res.status === 200) return { kind: 'ok', items: sanitizeRecognition(await res.json()).items };
    if (res.status === 429) return { kind: 'quota' };
    if (res.status === 401) return { kind: 'error', message: 'Das App-Token wird vom Server nicht akzeptiert.' };
    if (res.status === 413) return { kind: 'error', message: 'Das Foto ist zu groß.' };
    return { kind: 'error', message: 'Die Erkennung ist fehlgeschlagen. Bitte versuche es erneut.' };
  } catch {
    return { kind: 'offline' };
  } finally {
    clearTimeout(timer);
  }
}
