# Foto-Erkennung einrichten (kostenlos)

Die Foto-Erkennung läuft über einen eigenen kleinen Server, einen **Cloudflare Worker**. Dieser leitet das Foto an die **Google Gemini API** weiter. Der KI-Schlüssel liegt nur im Worker, nie in der App. Beide Dienste haben kostenlose Stufen. Ohne hinterlegte Zahlungsmethode sollten keine Kosten entstehen. Die aktuellen Bedingungen sind vor der Einrichtung zu prüfen; sie können sich ändern.

```
App ──(Foto, App-Token)──▶ Cloudflare Worker ──(Foto, API-Schlüssel)──▶ Gemini
    ◀──── JSON-Vorschläge ──                  ◀──────── JSON ──────────
```

Zeitaufwand: etwa 20 Minuten, einmalig. Sie benötigen einen PC mit Internet.

---

## 1. Gemini-API-Schlüssel (Google AI Studio)

1. https://aistudio.google.com öffnen und mit einem Google-Konto anmelden.
2. Links **„Get API key“** → **„Create API key“** wählen. Den Schlüssel kopieren und geheim halten.
3. **Keine Zahlungsmethode hinterlegen** und kein Billing aktivieren. Dann nutzen Sie ausschließlich die kostenlose Stufe; bei Erreichen des Limits lehnt Google weitere Anfragen ab, statt sie zu berechnen. Die App meldet dann „Tageslimit erreicht“.
4. Aktuelle Limits und Modelle: https://ai.google.dev/gemini-api/docs/pricing

> **Datenschutz:** In der kostenlosen Stufe darf Google Eingaben (also Ihre Essensfotos) zur Verbesserung seiner Dienste verwenden. Fotografieren Sie deshalb nur das Essen, keine Personen oder Dokumente. **[Aktuelle Nutzungsbedingungen prüfen: https://ai.google.dev/gemini-api/terms]**

## 2. Cloudflare-Konto

1. Auf https://dash.cloudflare.com/sign-up kostenlos registrieren. Eine Kreditkarte ist für Workers Free nicht nötig.
2. Der kostenlose Plan erlaubt derzeit 100.000 Anfragen pro Tag; für eine Person ist das weit mehr als genug. **[Aktuelle Limits prüfen: https://developers.cloudflare.com/workers/platform/pricing/]**

## 3. Node.js installieren

Laden Sie die LTS-Version von https://nodejs.org herunter und installieren Sie sie. Prüfen Sie die Installation im Terminal (Windows: „Eingabeaufforderung“ oder „PowerShell“):

```bash
node --version
```

## 4. Worker veröffentlichen

Im Projektordner:

```bash
cd backend/recognition-proxy
npm install
npx wrangler login          # öffnet den Browser → bei Cloudflare bestätigen
```

**App-Token erzeugen.** Das ist ein zufälliges Passwort, das App und Worker gemeinsam kennen:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Die Ausgabe kopieren und für Schritt 5 aufbewahren.

**Geheimnisse im Worker hinterlegen.** Jeder Befehl fragt nach dem Wert:

```bash
npx wrangler secret put APP_TOKEN        # das eben erzeugte Token einfügen
npx wrangler secret put GEMINI_API_KEY   # den Schlüssel aus Schritt 1 einfügen
```

**Veröffentlichen:**

```bash
npx wrangler deploy
```

Am Ende erscheint die Adresse des Workers, z. B. `https://naehrwert-recognition.IHR-KONTO.workers.dev`.

**Kurztest.** Ohne Token muss die Antwort „Ungültiges App-Token“ lauten:

```bash
curl -X POST https://naehrwert-recognition.IHR-KONTO.workers.dev/recognize
```

## 5. App mit dem Worker verbinden

Im Hauptordner des Projekts die Datei `.env.example` nach `.env.local` kopieren und ausfüllen:

```
EXPO_PUBLIC_RECOGNITION_URL=https://naehrwert-recognition.IHR-KONTO.workers.dev
EXPO_PUBLIC_RECOGNITION_TOKEN=das-token-aus-schritt-4
```

`.env.local` wird nicht ins Repository übernommen. Die Werte werden beim Bauen in die App eingebettet. Danach die App daher **neu bauen** (`npm run android` bzw. APK-Build; Anleitung folgt in Schritt 8). Für Builds über EAS werden dieselben zwei Werte als EAS-Umgebungsvariablen hinterlegt; auch das beschreibt Schritt 8.

## Sicherheit

- **Gemini-Schlüssel:** liegt nur verschlüsselt bei Cloudflare.
- **App-Token:** schützt den Worker vor fremder Nutzung. Es steckt in der App und ließe sich mit Aufwand aus der APK auslesen. Für eine private App ist das vertretbar. Im schlimmsten Fall verbraucht jemand Ihr kostenloses Kontingent, Kosten entstehen nicht. Dann einfach ein neues Token setzen (`wrangler secret put APP_TOKEN`) und die App neu bauen.
- **Protokollierung:** Der Worker speichert keine Fotos und schreibt weder Bilddaten noch Schlüssel ins Protokoll.

## Anpassungen

- **Modell wechseln:** `GEMINI_MODEL` in `wrangler.toml` ändern und erneut `npx wrangler deploy` ausführen. Sinnvoll, wenn Google ein Modell einstellt oder ein neues kostenloses Modell anbietet.
- **Anderer Anbieter** (z. B. kostenpflichtig Claude): Es muss nur `src/gemini.ts` im Worker ersetzt werden. Das Antwortformat für die App bleibt gleich, die App selbst ändert sich nicht.

## Fehlerbehebung

| Meldung in der App | Ursache | Lösung |
|---|---|---|
| „Foto-Erkennung einrichten“ | `.env.local` fehlt oder die App wurde danach nicht neu gebaut | Schritt 5 wiederholen und neu bauen |
| „App-Token wird nicht akzeptiert“ | Token in App und Worker verschieden | beide Werte angleichen |
| „Tageslimit erreicht“ | kostenloses Gemini-Kontingent verbraucht | am nächsten Tag erneut versuchen |
| „Erkennung fehlgeschlagen“ | Schlüssel ungültig oder Modell nicht verfügbar | `npx wrangler tail` zeigt das Protokoll; ggf. `GEMINI_MODEL` anpassen |
| „Keine Internetverbindung“ | Handy offline | Suche oder Barcode nutzen; der lokale Katalog funktioniert offline |
