// Nährwert – Foto-Erkennung (Cloudflare Worker)
// ERZEUGTE DATEI – nicht von Hand bearbeiten. Quelle: backend/recognition-proxy/src, Befehl: npm run bundle
// Vollständig kopieren und im Cloudflare-Editor den gesamten Inhalt von worker.js ersetzen.
// Benötigte Secrets: APP_TOKEN, GEMINI_API_KEY. Optional (Variable): GEMINI_MODEL.
// source-hash: f5ed8d02272de2c6

var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// ../../src/domain/recognition.ts
var MAX_ITEMS = 10;
function toNumber(value) {
  const n = typeof value === "string" ? Number(value.replace(",", ".")) : value;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}
__name(toNumber, "toNumber");
var clamp = /* @__PURE__ */ __name((n, min, max) => Math.min(max, Math.max(min, n)), "clamp");
var round1 = /* @__PURE__ */ __name((n) => Math.round(n * 10) / 10, "round1");
function sanitizeRecognition(raw) {
  const list = raw?.items;
  if (!Array.isArray(list)) return { items: [] };
  const items = [];
  for (const entry of list) {
    if (items.length >= MAX_ITEMS) break;
    const e = entry;
    if (!e || typeof e !== "object") continue;
    const name = typeof e.name === "string" ? e.name.trim().slice(0, 80) : "";
    const grams = toNumber(e.geschaetzteMenge_g);
    const kcal = toNumber(e.kcal);
    const carbs = toNumber(e.kohlenhydrate_g);
    const protein = toNumber(e.eiweiss_g);
    const fat = toNumber(e.fett_g);
    const confidence = toNumber(e.konfidenz);
    if (!name || grams == null || grams < 1 || grams > 3e3) continue;
    if (kcal == null || carbs == null || protein == null || fat == null) continue;
    if (kcal < 0 || carbs < 0 || protein < 0 || fat < 0) continue;
    if (kcal > grams * 9.5 || carbs + protein + fat > grams * 1.05) continue;
    items.push({
      name,
      geschaetzteMenge_g: Math.round(grams),
      kcal: Math.round(kcal),
      kohlenhydrate_g: round1(carbs),
      eiweiss_g: round1(protein),
      fett_g: round1(fat),
      // Fehlende Konfidenz gilt als unsicher; Prozentangaben (0–100) werden umgerechnet.
      konfidenz: confidence == null ? 0 : Math.round(clamp(confidence > 1 ? confidence / 100 : confidence, 0, 1) * 100) / 100
    });
  }
  return { items };
}
__name(sanitizeRecognition, "sanitizeRecognition");
var RECOGNITION_PROMPT = `Du bist Ern\xE4hrungsexperte. Analysiere das Foto einer Mahlzeit.
Erkenne jedes sichtbare Lebensmittel bzw. jede Komponente separat (z. B. Reis, H\xE4hnchen, So\xDFe getrennt).
Sch\xE4tze f\xFCr jede Komponente die Menge in Gramm anhand von Tellergr\xF6\xDFe, Besteck und \xFCblichen Portionen.
Gib die N\xE4hrwerte f\xFCr GENAU diese gesch\xE4tzte Menge an (nicht pro 100 g).
Verwende deutsche, allgemein verst\xE4ndliche Bezeichnungen.
"konfidenz" (0 bis 1) dr\xFCckt aus, wie sicher Erkennung UND Mengensch\xE4tzung sind; sei vorsichtig und ehrlich.
Ist kein Essen erkennbar, gib {"items": []} zur\xFCck.
Antworte ausschlie\xDFlich mit JSON in diesem Format:
{"items":[{"name":"string","geschaetzteMenge_g":0,"kcal":0,"kohlenhydrate_g":0,"eiweiss_g":0,"fett_g":0,"konfidenz":0}]}`;

// src/gemini.ts
var UpstreamError = class extends Error {
  constructor(message, kind) {
    super(message);
    this.kind = kind;
    this.name = "UpstreamError";
  }
  kind;
  static {
    __name(this, "UpstreamError");
  }
};
var API_BASE = "https://generativelanguage.googleapis.com/v1beta/models/";
var RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    items: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          name: { type: "STRING" },
          geschaetzteMenge_g: { type: "NUMBER" },
          kcal: { type: "NUMBER" },
          kohlenhydrate_g: { type: "NUMBER" },
          eiweiss_g: { type: "NUMBER" },
          fett_g: { type: "NUMBER" },
          konfidenz: { type: "NUMBER" }
        },
        required: ["name", "geschaetzteMenge_g", "kcal", "kohlenhydrate_g", "eiweiss_g", "fett_g", "konfidenz"]
      }
    }
  },
  required: ["items"]
};
function extractJson(text) {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  return JSON.parse(cleaned);
}
__name(extractJson, "extractJson");
async function recognizeWithGemini(image, config, fetchFn) {
  const res = await fetchFn(`${API_BASE}${encodeURIComponent(config.model)}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": config.apiKey },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: RECOGNITION_PROMPT }, { inlineData: { mimeType: image.mimeType, data: image.base64 } }]
        }
      ],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA
      }
    })
  });
  if (res.status === 429) throw new UpstreamError("Kontingent der kostenlosen Stufe ersch\xF6pft", "quota");
  if (!res.ok) throw new UpstreamError(`Gemini antwortete mit HTTP ${res.status}`, "upstream");
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  if (!text) return { items: [] };
  try {
    return sanitizeRecognition(extractJson(text));
  } catch {
    throw new UpstreamError("Antwort des Modells war kein g\xFCltiges JSON", "upstream");
  }
}
__name(recognizeWithGemini, "recognizeWithGemini");

// src/handler.ts
var DEFAULT_MODEL = "gemini-2.5-flash";
var MAX_BODY_CHARS = 4e6;
var ALLOWED_MIME = /* @__PURE__ */ new Set(["image/jpeg", "image/png", "image/webp"]);
function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}
__name(json, "json");
var error = /* @__PURE__ */ __name((status, code, message) => json(status, { error: code, message }), "error");
function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
__name(safeEqual, "safeEqual");
async function handleRequest(request, env, fetchFn = fetch) {
  const url = new URL(request.url);
  if (url.pathname !== "/recognize") return error(404, "not_found", "Unbekannter Pfad");
  if (request.method !== "POST") return error(405, "method_not_allowed", "Nur POST erlaubt");
  if (!env.APP_TOKEN || !env.GEMINI_API_KEY) {
    return error(500, "not_configured", "APP_TOKEN oder GEMINI_API_KEY ist nicht gesetzt");
  }
  const auth = request.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!safeEqual(token, env.APP_TOKEN)) return error(401, "unauthorized", "Ung\xFCltiges App-Token");
  const text = await request.text();
  if (text.length > MAX_BODY_CHARS) return error(413, "too_large", "Bild zu gro\xDF");
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    return error(400, "bad_request", "Ung\xFCltiges JSON");
  }
  const image = typeof body.image === "string" ? body.image : "";
  const mimeType = typeof body.mimeType === "string" ? body.mimeType : "";
  if (!image || !/^[A-Za-z0-9+/]+={0,2}$/.test(image)) return error(400, "bad_request", "Bild fehlt oder ist kein Base64");
  if (!ALLOWED_MIME.has(mimeType)) return error(400, "bad_request", "Nicht unterst\xFCtztes Bildformat");
  try {
    const result = await recognizeWithGemini(
      { base64: image, mimeType },
      { apiKey: env.GEMINI_API_KEY, model: env.GEMINI_MODEL || DEFAULT_MODEL },
      fetchFn
    );
    return json(200, result);
  } catch (e) {
    if (e instanceof UpstreamError && e.kind === "quota") {
      return error(429, "quota", "Tageskontingent erreicht \u2013 bitte sp\xE4ter erneut versuchen");
    }
    console.error("Erkennung fehlgeschlagen:", e instanceof Error ? e.message : "unbekannt");
    return error(502, "upstream", "Die Erkennung ist fehlgeschlagen");
  }
}
__name(handleRequest, "handleRequest");

// src/index.ts
var index_default = {
  fetch(request, env) {
    return handleRequest(request, env);
  }
};
export {
  index_default as default
};
