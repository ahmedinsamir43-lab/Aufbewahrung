/**
 * @jest-environment node
 */
import { getEntriesForDate } from '@/db/repositories/log';
import { createMigratedDb } from '@/db/testing/node-sqlite';

import { logRecognizedItems } from '../log-service';
import {
  loadRecognitionConfig,
  normalizeWorkerUrl,
  readConfig,
  recognizeMeal,
  saveRecognitionConfig,
  testRecognitionConnection,
} from '../recognition';

const config = { url: 'https://proxy.example', token: 't0k3n' };
const item = {
  name: 'Spaghetti Bolognese',
  geschaetzteMenge_g: 350,
  kcal: 520,
  kohlenhydrate_g: 62,
  eiweiss_g: 24,
  fett_g: 18,
  konfidenz: 0.82,
};

function fake(status: number, body: unknown) {
  const calls: { url: string; init: { headers: Record<string, string>; body: string } }[] = [];
  const fn = async (url: string, init: { headers: Record<string, string>; body: string }) => {
    calls.push({ url, init });
    return { status, json: async () => body };
  };
  return Object.assign(fn, { calls });
}

describe('readConfig', () => {
  it('liest URL und Token und entfernt abschließende Schrägstriche', () => {
    expect(readConfig({ EXPO_PUBLIC_RECOGNITION_URL: 'https://x.workers.dev/', EXPO_PUBLIC_RECOGNITION_TOKEN: ' t ' })).toEqual({
      url: 'https://x.workers.dev',
      token: 't',
    });
  });

  it('ist ohne vollständige Konfiguration null', () => {
    expect(readConfig({})).toBeNull();
    expect(readConfig({ EXPO_PUBLIC_RECOGNITION_URL: 'x.workers.dev', EXPO_PUBLIC_RECOGNITION_TOKEN: 't' })).toBeNull();
  });
});

describe('recognizeMeal', () => {
  it('sendet Bild und Token an /recognize und liefert bereinigte Vorschläge', async () => {
    const f = fake(200, { items: [item, { name: 'kaputt' }] });
    await expect(recognizeMeal('QUJD', config, f)).resolves.toEqual({ kind: 'ok', items: [item] });
    expect(f.calls[0].url).toBe('https://proxy.example/recognize');
    expect(f.calls[0].init.headers.authorization).toBe('Bearer t0k3n');
    expect(JSON.parse(f.calls[0].init.body)).toEqual({ image: 'QUJD', mimeType: 'image/jpeg' });
  });

  it('meldet fehlende Konfiguration, Kontingent, Fehler und Offline', async () => {
    await expect(recognizeMeal('x', null, fake(200, {}))).resolves.toEqual({ kind: 'not_configured' });
    await expect(recognizeMeal('x', config, fake(429, {}))).resolves.toEqual({ kind: 'quota' });
    await expect(recognizeMeal('x', config, fake(401, {}))).resolves.toMatchObject({ kind: 'error' });
    await expect(recognizeMeal('x', config, fake(502, {}))).resolves.toMatchObject({ kind: 'error' });
    const offline = async () => {
      throw new TypeError('Network request failed');
    };
    await expect(recognizeMeal('x', config, offline)).resolves.toEqual({ kind: 'offline' });
  });
});

describe('normalizeWorkerUrl', () => {
  it.each([
    ['naehrwert-recognition.alex.workers.dev', 'https://naehrwert-recognition.alex.workers.dev'],
    ['https://naehrwert-recognition.alex.workers.dev/', 'https://naehrwert-recognition.alex.workers.dev'],
    [' https://x.workers.dev/recognize ', 'https://x.workers.dev'],
    ['HTTPS://X.workers.dev', 'https://x.workers.dev'],
  ])('%s → %s', (input, expected) => {
    expect(normalizeWorkerUrl(input)).toBe(expected);
  });

  it('lehnt Unbrauchbares ab', () => {
    expect(normalizeWorkerUrl('')).toBeNull();
    expect(normalizeWorkerUrl('localhost')).toBeNull();
    expect(normalizeWorkerUrl('nicht eine adresse')).toBeNull();
  });
});

describe('Einrichtung in der App', () => {
  it('speichert die Konfiguration lokal und lädt sie wieder', async () => {
    const db = await createMigratedDb();
    await expect(loadRecognitionConfig(db)).resolves.toBeNull();
    await saveRecognitionConfig(db, config);
    await expect(loadRecognitionConfig(db)).resolves.toEqual(config);
  });
});

describe('testRecognitionConnection', () => {
  it.each([
    [200, { items: [] }, 'ok'],
    [200, 'Hello World!', 'wrong_url'], // Cloudflare-Vorlage ohne eingefügten Code
    [429, {}, 'quota'],
    [401, { error: 'unauthorized' }, 'wrong_token'],
    [500, { error: 'not_configured' }, 'missing_secrets'],
    [502, { error: 'upstream' }, 'gemini_rejected'],
    [404, {}, 'wrong_url'],
  ] as const)('HTTP %i → %s', async (status, body, expected) => {
    await expect(testRecognitionConnection(config, fake(status, body))).resolves.toBe(expected);
  });

  it('meldet nicht erreichbare Adressen', async () => {
    const offline = async () => {
      throw new TypeError('Network request failed');
    };
    await expect(testRecognitionConnection(config, offline)).resolves.toBe('unreachable');
  });

  it('sendet ein Test-PNG mit Token an /recognize', async () => {
    const f = fake(200, { items: [] });
    await testRecognitionConnection(config, f);
    expect(f.calls[0].url).toBe('https://proxy.example/recognize');
    expect(f.calls[0].init.headers.authorization).toBe('Bearer t0k3n');
    expect(JSON.parse(f.calls[0].init.body).mimeType).toBe('image/png');
  });
});

describe('logRecognizedItems', () => {
  it('speichert bestätigte Vorschläge mit umgerechneter Menge und Konfidenz', async () => {
    const db = await createMigratedDb();
    const low = { ...item, name: 'Parmesan', geschaetzteMenge_g: 10, kcal: 40, kohlenhydrate_g: 0, eiweiss_g: 3.5, fett_g: 2.8, konfidenz: 0.4 };
    await logRecognizedItems(
      db,
      [
        { item, name: 'Spaghetti Bolognese', amountG: 400 },
        { item: low, name: '  ', amountG: 10 },
      ],
      { date: '2026-10-04', meal: 'dinner' },
    );
    const entries = await getEntriesForDate(db, '2026-10-04');
    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({ name: 'Spaghetti Bolognese', amountG: 400, source: 'photo', isEstimate: false, confidence: 0.82, foodId: null });
    expect(entries[0].kcal).toBeCloseTo(594.3, 1); // 520 / 350 × 400
    expect(entries[1]).toMatchObject({ name: 'Parmesan', isEstimate: true, confidence: 0.4 });
  });
});
