/**
 * Foto-Erkennung über den eigenen Backend-Proxy (Cloudflare Worker → Gemini).
 *
 * Konfiguration (Worker-Adresse und App-Token) wird in der App eingerichtet und lokal in
 * SQLite gespeichert (Screen „Foto-Erkennung einrichten“). Alternativ – etwa für Entwickler –
 * zur Build-Zeit über EXPO_PUBLIC_RECOGNITION_URL / EXPO_PUBLIC_RECOGNITION_TOKEN.
 * Der eigentliche KI-Schlüssel liegt ausschließlich im Worker.
 */
import type { Db } from '@/db/database';
import { deleteSetting, getSetting, setSetting, SETTING_KEYS } from '@/db/repositories/settings';
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

/**
 * Normalisiert eine eingegebene Worker-Adresse: ergänzt https://, entfernt abschließende
 * Schrägstriche und ein versehentlich mitkopiertes „/recognize“. `null`, wenn unbrauchbar.
 */
export function normalizeWorkerUrl(input: string): string | null {
  let url = input.trim();
  if (!url) return null;
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  url = url.replace(/\/+$/, '').replace(/\/recognize$/i, '').replace(/\/+$/, '');
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes('.') || /\s/.test(url)) return null;
    return `${parsed.protocol}//${parsed.host}${parsed.pathname === '/' ? '' : parsed.pathname}`;
  } catch {
    return null;
  }
}

export function readConfig(env: Record<string, string | undefined> = {
  EXPO_PUBLIC_RECOGNITION_URL: process.env.EXPO_PUBLIC_RECOGNITION_URL,
  EXPO_PUBLIC_RECOGNITION_TOKEN: process.env.EXPO_PUBLIC_RECOGNITION_TOKEN,
}): RecognitionConfig | null {
  const raw = env.EXPO_PUBLIC_RECOGNITION_URL?.trim();
  const token = env.EXPO_PUBLIC_RECOGNITION_TOKEN?.trim();
  if (!raw || !token || !/^https?:\/\//.test(raw)) return null;
  const url = normalizeWorkerUrl(raw);
  return url ? { url, token } : null;
}

/** In der App gespeicherte Einrichtung, sonst die Build-Konfiguration. */
export async function loadRecognitionConfig(db: Db): Promise<RecognitionConfig | null> {
  const stored = await getSetting<RecognitionConfig>(db, SETTING_KEYS.recognition);
  if (stored?.url && stored.token) return stored;
  return readConfig();
}

export async function saveRecognitionConfig(db: Db, config: RecognitionConfig): Promise<void> {
  await setSetting(db, SETTING_KEYS.recognition, config);
}

export async function clearRecognitionConfig(db: Db): Promise<void> {
  await deleteSetting(db, SETTING_KEYS.recognition);
}

type FetchFn = (
  input: string,
  init: { method: string; headers: Record<string, string>; body: string; signal: AbortSignal },
) => Promise<{ status: number; json(): Promise<unknown> }>;

async function post(config: RecognitionConfig, body: unknown, fetchFn: FetchFn, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchFn(`${config.url}/recognize`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${config.token}` },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

/** Sendet ein Bild (Base64) an den Proxy und liefert bereinigte Vorschläge. */
export async function recognizeMeal(
  imageBase64: string,
  config: RecognitionConfig | null,
  fetchFn: FetchFn = fetch,
  mimeType: 'image/jpeg' | 'image/png' = 'image/jpeg',
): Promise<RecognitionResult> {
  if (!config) return { kind: 'not_configured' };
  try {
    const res = await post(config, { image: imageBase64, mimeType }, fetchFn, TIMEOUT_MS);
    if (res.status === 200) return { kind: 'ok', items: sanitizeRecognition(await res.json()).items };
    if (res.status === 429) return { kind: 'quota' };
    if (res.status === 401) return { kind: 'error', message: 'Das App-Token wird vom Server nicht akzeptiert.' };
    if (res.status === 413) return { kind: 'error', message: 'Das Foto ist zu groß.' };
    return { kind: 'error', message: 'Die Erkennung ist fehlgeschlagen. Bitte versuche es erneut.' };
  } catch {
    return { kind: 'offline' };
  }
}

/** 1×1-Pixel-PNG: minimale Testanfrage, die die gesamte Kette bis zu Gemini prüft. */
const TEST_IMAGE_PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

export type ConnectionTest =
  | 'ok'
  | 'quota'
  | 'wrong_token'
  | 'missing_secrets'
  | 'gemini_rejected'
  | 'wrong_url'
  | 'unreachable';

export const CONNECTION_MESSAGES: Record<ConnectionTest, { ok: boolean; title: string; text: string }> = {
  ok: { ok: true, title: 'Verbindung funktioniert', text: 'Worker, Token und Gemini-Schlüssel sind korrekt eingerichtet.' },
  quota: {
    ok: true,
    title: 'Verbindung funktioniert',
    text: 'Alles ist korrekt eingerichtet, das kostenlose Tageskontingent ist aber gerade aufgebraucht.',
  },
  wrong_token: {
    ok: false,
    title: 'Token stimmt nicht überein',
    text: 'Der Worker ist erreichbar, kennt aber ein anderes Token. Kopiere das Token aus dieser App erneut in das Secret APP_TOKEN bei Cloudflare (Schritt C2) – ohne Leerzeichen am Anfang oder Ende.',
  },
  missing_secrets: {
    ok: false,
    title: 'Secrets fehlen im Worker',
    text: 'Bei Cloudflare fehlt das Secret GEMINI_API_KEY (Schritt B5) oder APP_TOKEN (Schritt C2). Nach dem Hinzufügen 1 Minute warten und erneut testen.',
  },
  gemini_rejected: {
    ok: false,
    title: 'Gemini lehnt die Anfrage ab',
    text: 'Worker und Token sind korrekt, aber der Gemini-Schlüssel ist ungültig oder das Modell nicht verfügbar. Prüfe GEMINI_API_KEY bei Cloudflare.',
  },
  wrong_url: {
    ok: false,
    title: 'Adresse antwortet nicht wie erwartet',
    text: 'Unter dieser Adresse läuft ein Server, aber nicht der Nährwert-Worker. Prüfe, ob der Code aus Schritt B4 vollständig eingefügt und „Deploy“ gedrückt wurde.',
  },
  unreachable: {
    ok: false,
    title: 'Adresse nicht erreichbar',
    text: 'Prüfe die Adresse (endet auf .workers.dev) und deine Internetverbindung.',
  },
};

/** Prüft Erreichbarkeit, Token und Gemini-Schlüssel mit einer minimalen Erkennungsanfrage. */
export async function testRecognitionConnection(config: RecognitionConfig, fetchFn: FetchFn = fetch): Promise<ConnectionTest> {
  try {
    const res = await post(config, { image: TEST_IMAGE_PNG, mimeType: 'image/png' }, fetchFn, 30_000);
    switch (res.status) {
      case 200: {
        // Die Cloudflare-Vorlage „Hello World“ antwortet ebenfalls mit 200 – daher Format prüfen.
        const body = (await res.json().catch(() => null)) as { items?: unknown } | null;
        return Array.isArray(body?.items) ? 'ok' : 'wrong_url';
      }
      case 429:
        return 'quota';
      case 401:
        return 'wrong_token';
      case 500: {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        return body?.error === 'not_configured' ? 'missing_secrets' : 'wrong_url';
      }
      case 502:
        return 'gemini_rejected';
      default:
        return 'wrong_url';
    }
  } catch {
    return 'unreachable';
  }
}
