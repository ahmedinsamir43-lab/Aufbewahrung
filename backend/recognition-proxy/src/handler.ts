/**
 * Request-Verarbeitung des Proxys – unabhängig von der Cloudflare-Laufzeit testbar.
 *
 * POST /recognize
 *   Authorization: Bearer <APP_TOKEN>
 *   { "image": "<base64>", "mimeType": "image/jpeg" }
 * → 200 { "items": [...] }   (Format siehe src/domain/recognition.ts)
 */
import { recognizeWithGemini, UpstreamError } from './gemini';

export interface Env {
  /** Geheimnis, das die App mitsendet (wrangler secret put APP_TOKEN). */
  APP_TOKEN?: string;
  /** API-Schlüssel aus Google AI Studio (wrangler secret put GEMINI_API_KEY). */
  GEMINI_API_KEY?: string;
  /** Modellname, siehe wrangler.toml. */
  GEMINI_MODEL?: string;
}

export const DEFAULT_MODEL = 'gemini-2.5-flash';
/** Base64 eines auf 1024 px verkleinerten JPEG liegt bei ca. 0,1–0,5 MB; großzügige Obergrenze. */
export const MAX_BODY_CHARS = 4_000_000;
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

const error = (status: number, code: string, message: string) => json(status, { error: code, message });

/** Vergleich in konstanter Zeit, um das Erraten des Tokens über Antwortzeiten zu erschweren. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function handleRequest(request: Request, env: Env, fetchFn: typeof fetch = fetch): Promise<Response> {
  const url = new URL(request.url);
  if (url.pathname !== '/recognize') return error(404, 'not_found', 'Unbekannter Pfad');
  if (request.method !== 'POST') return error(405, 'method_not_allowed', 'Nur POST erlaubt');

  if (!env.APP_TOKEN || !env.GEMINI_API_KEY) {
    return error(500, 'not_configured', 'APP_TOKEN oder GEMINI_API_KEY ist nicht gesetzt');
  }
  const auth = request.headers.get('authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!safeEqual(token, env.APP_TOKEN)) return error(401, 'unauthorized', 'Ungültiges App-Token');

  const text = await request.text();
  if (text.length > MAX_BODY_CHARS) return error(413, 'too_large', 'Bild zu groß');

  let body: { image?: unknown; mimeType?: unknown };
  try {
    body = JSON.parse(text);
  } catch {
    return error(400, 'bad_request', 'Ungültiges JSON');
  }
  const image = typeof body.image === 'string' ? body.image : '';
  const mimeType = typeof body.mimeType === 'string' ? body.mimeType : '';
  if (!image || !/^[A-Za-z0-9+/]+={0,2}$/.test(image)) return error(400, 'bad_request', 'Bild fehlt oder ist kein Base64');
  if (!ALLOWED_MIME.has(mimeType)) return error(400, 'bad_request', 'Nicht unterstütztes Bildformat');

  try {
    const result = await recognizeWithGemini(
      { base64: image, mimeType },
      { apiKey: env.GEMINI_API_KEY, model: env.GEMINI_MODEL || DEFAULT_MODEL },
      fetchFn,
    );
    return json(200, result);
  } catch (e) {
    if (e instanceof UpstreamError && e.kind === 'quota') {
      return error(429, 'quota', 'Tageskontingent erreicht – bitte später erneut versuchen');
    }
    // Keine Bilddaten oder Schlüssel ins Log schreiben.
    console.error('Erkennung fehlgeschlagen:', e instanceof Error ? e.message : 'unbekannt');
    return error(502, 'upstream', 'Die Erkennung ist fehlgeschlagen');
  }
}
