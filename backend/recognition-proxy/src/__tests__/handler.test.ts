/**
 * @jest-environment node
 */
import { extractJson } from '../gemini';
import { handleRequest, MAX_BODY_CHARS, safeEqual, type Env } from '../handler';

// Erwartete Fehlerprotokolle des Handlers in der Testausgabe unterdrücken.
beforeAll(() => jest.spyOn(console, 'error').mockImplementation(() => {}));

const env: Env = { APP_TOKEN: 'geheim-123', GEMINI_API_KEY: 'key', GEMINI_MODEL: 'gemini-test' };
const IMAGE = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const item = {
  name: 'Spaghetti Bolognese',
  geschaetzteMenge_g: 350,
  kcal: 520,
  kohlenhydrate_g: 62,
  eiweiss_g: 24,
  fett_g: 18,
  konfidenz: 0.82,
};

function req(body: unknown, init: { token?: string | null; method?: string; path?: string } = {}) {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (init.token !== null) headers.authorization = `Bearer ${init.token ?? env.APP_TOKEN}`;
  return new Request(`https://proxy.example${init.path ?? '/recognize'}`, {
    method: init.method ?? 'POST',
    headers,
    body: init.method === 'GET' ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  });
}

function gemini(status: number, payload: unknown) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fn = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return new Response(JSON.stringify(payload), { status });
  }) as unknown as typeof fetch;
  return Object.assign(fn, { calls });
}

const ok = (text: string) => ({ candidates: [{ content: { parts: [{ text }] } }] });
const valid = { image: IMAGE, mimeType: 'image/jpeg' };

describe('Proxy: Zugriff und Validierung', () => {
  it('404 für unbekannte Pfade, 405 für andere Methoden', async () => {
    expect((await handleRequest(req(valid, { path: '/' }), env, gemini(200, {}))).status).toBe(404);
    expect((await handleRequest(req(null, { method: 'GET' }), env, gemini(200, {}))).status).toBe(405);
  });

  it('500, wenn Secrets fehlen', async () => {
    const r = await handleRequest(req(valid), { APP_TOKEN: 'x' }, gemini(200, {}));
    expect(r.status).toBe(500);
  });

  it('401 ohne oder mit falschem Token', async () => {
    expect((await handleRequest(req(valid, { token: null }), env, gemini(200, {}))).status).toBe(401);
    expect((await handleRequest(req(valid, { token: 'falsch' }), env, gemini(200, {}))).status).toBe(401);
  });

  it('400 bei ungültigem JSON, fehlendem Bild oder Format', async () => {
    const g = gemini(200, {});
    expect((await handleRequest(req('{kein json'), env, g)).status).toBe(400);
    expect((await handleRequest(req({ mimeType: 'image/jpeg' }), env, g)).status).toBe(400);
    expect((await handleRequest(req({ image: 'kein base64!', mimeType: 'image/jpeg' }), env, g)).status).toBe(400);
    expect((await handleRequest(req({ image: IMAGE, mimeType: 'image/gif' }), env, g)).status).toBe(400);
    expect(g.calls).toHaveLength(0);
  });

  it('413 bei zu großem Bild', async () => {
    const r = await handleRequest(req({ image: 'A'.repeat(MAX_BODY_CHARS), mimeType: 'image/jpeg' }), env, gemini(200, {}));
    expect(r.status).toBe(413);
  });
});

describe('Proxy: Erkennung', () => {
  it('ruft Gemini mit Schlüssel, Modell, Bild und JSON-Schema auf und liefert das Format', async () => {
    const g = gemini(200, ok(JSON.stringify({ items: [item] })));
    const r = await handleRequest(req(valid), env, g);
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ items: [item] });

    const { url, init } = g.calls[0];
    expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-test:generateContent');
    expect((init.headers as Record<string, string>)['x-goog-api-key']).toBe('key');
    const sent = JSON.parse(init.body as string);
    expect(sent.contents[0].parts[1].inlineData).toEqual({ mimeType: 'image/jpeg', data: IMAGE });
    expect(sent.generationConfig.responseMimeType).toBe('application/json');
    expect(sent.generationConfig.responseSchema.required).toEqual(['items']);
  });

  it('bereinigt die Modellantwort (Codeblock, unplausible Einträge)', async () => {
    const text = '```json\n' + JSON.stringify({ items: [item, { ...item, kcal: 99999 }] }) + '\n```';
    const r = await handleRequest(req(valid), env, gemini(200, ok(text)));
    expect(await r.json()).toEqual({ items: [item] });
  });

  it('leere Liste, wenn das Modell keinen Text liefert (z. B. Filter)', async () => {
    const r = await handleRequest(req(valid), env, gemini(200, { candidates: [] }));
    expect(await r.json()).toEqual({ items: [] });
  });

  it('429 bei erschöpftem Kontingent, 502 bei sonstigen Fehlern', async () => {
    expect((await handleRequest(req(valid), env, gemini(429, {}))).status).toBe(429);
    expect((await handleRequest(req(valid), env, gemini(403, {}))).status).toBe(502);
    expect((await handleRequest(req(valid), env, gemini(200, ok('kein json')))).status).toBe(502);
  });
});

describe('Hilfsfunktionen', () => {
  it('safeEqual', () => {
    expect(safeEqual('abc', 'abc')).toBe(true);
    expect(safeEqual('abc', 'abd')).toBe(false);
    expect(safeEqual('abc', 'abcd')).toBe(false);
  });

  it('extractJson', () => {
    expect(extractJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(extractJson(' {"a":1} ')).toEqual({ a: 1 });
  });
});
