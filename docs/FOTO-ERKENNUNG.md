# Foto-Erkennung einrichten – Schritt für Schritt

Diese Anleitung setzt **keine Programmierkenntnisse** voraus. Sie brauchen weder ein Terminal noch Node.js. Alles geschieht im Browser und in der App.

## Überblick

| Teil | Was passiert | Wo | Dauer |
|---|---|---|---|
| **A** | Gemini-Schlüssel anlegen (die KI, die Fotos erkennt) | Browser, am besten am PC | ca. 5 Min. |
| **B** | Cloudflare Worker anlegen (Ihr kleiner Server, der den Schlüssel geheim hält) | Browser am PC | ca. 10 Min. |
| **C** | App mit dem Worker verbinden | App auf dem Handy + Cloudflare | ca. 5 Min. |

> **Wann?** Teil A und B können Sie sofort erledigen. Teil C geht erst, wenn die App auf Ihrem Handy installiert ist (Schritt 8 des Projekts).

**Kosten:** keine. Beide Dienste haben kostenlose Stufen. Sie hinterlegen nirgends eine Zahlungsmethode, daher kann nichts berechnet werden. Ist das kostenlose Tageskontingent aufgebraucht, meldet die App „Tageslimit erreicht“, und am nächsten Tag geht es weiter.

**Hinweis:** Die Menüpunkte bei Google und Cloudflare ändern sich gelegentlich. Weicht eine Bezeichnung ab, suchen Sie nach dem sinngemäßen Begriff. Die englischen Originalbezeichnungen stehen jeweils dabei.

### Notizzettel

Öffnen Sie eine leere Notiz (z. B. Editor/Notepad am PC). Darin sammeln Sie zwei Dinge, die Sie später brauchen:

| Was | Woher | Beispiel |
|---|---|---|
| Gemini-Schlüssel | Schritt A5 | `AIzaSyB…` (ca. 39 Zeichen) |
| Worker-Adresse | Schritt B6 | `naehrwert-recognition.alex123.workers.dev` |

> Den Gemini-Schlüssel niemandem zeigen und nicht öffentlich posten. Nach Abschluss von Teil B können Sie die Notiz löschen; der Schlüssel liegt dann sicher bei Cloudflare.

---

## Teil A – Gemini-Schlüssel anlegen (Google AI Studio)

**A1.** Im Browser **https://aistudio.google.com** öffnen.

**A2.** Mit Ihrem Google-Konto (Gmail-Adresse) anmelden. Beim ersten Besuch erscheinen Nutzungsbedingungen: Häkchen setzen und bestätigen (*Continue* / *Weiter*).

**A3.** Den Menüpunkt **„Get API key“** (deutsch ggf. *„API-Schlüssel abrufen“*) anklicken. Er steht in der linken Seitenleiste oder oben rechts.

**A4.** Auf **„Create API key“** (*„API-Schlüssel erstellen“*) klicken.
- Fragt Google nach einem Projekt, das vorgeschlagene Projekt wählen oder *„Create API key in new project“* nehmen.

**A5.** Der Schlüssel wird angezeigt; er beginnt meist mit **`AIza`**. Mit dem **Kopieren-Symbol** daneben kopieren und in den Notizzettel einfügen.

**A6.** ⚠️ **Nicht** auf *„Set up billing“* bzw. *„Abrechnung einrichten“* klicken. Ohne Abrechnung bleibt der Schlüssel in der kostenlosen Stufe. In der Schlüsselliste steht dann beim Tarif *„Free“* bzw. *„Kostenlos“*.

> **Datenschutz:** In der kostenlosen Stufe darf Google die Fotos zur Verbesserung seiner Dienste verwenden. Fotografieren Sie daher nur das Essen, keine Personen, Dokumente oder Bildschirme. Bedingungen: https://ai.google.dev/gemini-api/terms

✅ **Ergebnis Teil A:** Der Gemini-Schlüssel steht im Notizzettel.

---

## Teil B – Cloudflare Worker anlegen

### B1. Kostenloses Konto erstellen

1. **https://dash.cloudflare.com/sign-up** öffnen.
2. E-Mail-Adresse und Passwort eingeben und auf *„Sign up“* klicken.
3. Die Bestätigungsmail von Cloudflare öffnen und den Link anklicken.
4. Fragt Cloudflare nach einer Website oder Domain, überspringen Sie das (*„Skip“*). Für einen Worker wird keine Domain gebraucht.
5. Eine Kreditkarte ist **nicht** nötig. Wählen Sie keinen kostenpflichtigen Tarif; der Plan *„Free“* genügt.

### B2. Worker erstellen

1. Im Cloudflare-Dashboard links auf **„Compute (Workers)“** und dann **„Workers & Pages“** klicken.
2. Auf **„Create“** (bzw. *„Create application“*) klicken.
3. **„Start with Hello World!“** wählen (bzw. die Vorlage *„Hello World“*).
4. Als Namen **`naehrwert-recognition`** eintragen.
5. Auf **„Deploy“** klicken.

> Beim allerersten Worker fragt Cloudflare evtl. nach einer **workers.dev-Subdomain**. Wählen Sie einen kurzen Namen, z. B. `alex123`. Er wird Teil Ihrer Adresse.

### B3. Den fertigen Code holen (von GitHub)

1. Bei **https://github.com** anmelden. Das Repository ist privat, deshalb ist die Anmeldung nötig.
2. Diesen Link öffnen:
   **https://github.com/ahmedinsamir43-lab/Aufbewahrung/blob/claude/nutrition-tracker-react-native-f5itpb/backend/recognition-proxy/dist/worker.js**
3. Oben rechts über dem Code auf das Symbol **„Copy raw file“** klicken (zwei überlappende Rechtecke).
   - *Alternative:* auf **„Raw“** klicken, dann **Strg+A** (alles markieren) und **Strg+C** (kopieren).

Der Code (ca. 8 KB, rund 200 Zeilen) ist jetzt in der Zwischenablage.

> Funktioniert der Link nicht, gehen Sie so vor: Repository **`ahmedinsamir43-lab/Aufbewahrung`** öffnen, mit der Branch-Auswahl oben links **`claude/nutrition-tracker-react-native-f5itpb`** wählen (sobald die Änderungen in `main` übernommen sind, auch `main`) und dann die Ordner **`backend` → `recognition-proxy` → `dist` → `worker.js`** öffnen.

### B4. Code im Worker einfügen

1. Zurück im Cloudflare-Tab beim Worker `naehrwert-recognition` oben rechts auf **„Edit code“** klicken. Ein Editor öffnet sich; links ist die Datei `worker.js` ausgewählt.
2. In den Code-Bereich klicken.
3. **Strg+A** drücken (alles markieren), dann **Entf** (alles löschen).
4. **Strg+V** drücken (Code einfügen).
5. Prüfen: Die **erste Zeile** muss lauten:
   `// Nährwert – Foto-Erkennung (Cloudflare Worker)`
6. Oben rechts auf **„Deploy“** klicken und bestätigen.

### B5. Gemini-Schlüssel als Secret hinterlegen

1. Oben links auf den Worker-Namen klicken, um zur Übersicht zurückzukehren.
2. Den Reiter **„Settings“** öffnen.
3. Im Abschnitt **„Variables and Secrets“** auf **„+ Add“** klicken.
4. Ausfüllen:
   - **Type:** `Secret`. Wichtig: nicht *Text*, sonst ist der Schlüssel sichtbar.
   - **Variable name:** `GEMINI_API_KEY`. Exakt so: Großbuchstaben, Unterstriche, keine Leerzeichen.
   - **Value:** den Gemini-Schlüssel aus dem Notizzettel einfügen.
5. Auf **„Deploy“** klicken (bzw. *„Save and deploy“*).

### B6. Worker-Adresse notieren

Im Reiter **„Settings“** unter **„Domains & Routes“** steht beim Typ *workers.dev* Ihre Adresse, z. B.

```
naehrwert-recognition.alex123.workers.dev
```

Notieren Sie sie im Notizzettel. Sie erscheint auch auf der Übersichtsseite neben *„Visit“*.

### B7. Kurztest im Browser

Rufen Sie in einem neuen Browser-Tab Ihre Adresse mit dem Zusatz `/recognize` auf:

```
https://naehrwert-recognition.alex123.workers.dev/recognize
```

| Anzeige | Bedeutung |
|---|---|
| `{"error":"method_not_allowed","message":"Nur POST erlaubt"}` | ✅ Richtig – der Nährwert-Code läuft. |
| `Hello World!` | ❌ Der Code aus B4 ist nicht aktiv. B4 wiederholen und „Deploy“ drücken. |
| Seite nicht gefunden | ❌ Adresse prüfen (Tippfehler, Subdomain aus B2). |

✅ **Ergebnis Teil B:** Der Worker läuft, der Gemini-Schlüssel ist hinterlegt, die Adresse ist notiert.

---

## Teil C – App verbinden (nach Installation der App)

**C1.** In der App auf **„+“** tippen, dann **„Foto aufnehmen“**, dann **„Jetzt einrichten“**.

**C2.** Den **App-Token** zu Cloudflare übertragen. Die App hat bereits ein zufälliges Token erzeugt; es schützt Ihren Worker vor fremder Nutzung.

Zuerst das Token aus der App holen:
- **Cloudflare am Handy:** auf **„Kopieren“** tippen.
- **Cloudflare am PC:** auf **„Teilen“** tippen und das Token an sich selbst schicken, z. B. per E-Mail, dann am PC kopieren.

Dann bei Cloudflare – genau wie in B5 – ein **zweites Secret** anlegen und auf **„Deploy“** klicken:
- **Type:** `Secret`
- **Variable name:** `APP_TOKEN`
- **Value:** das Token. Es sind 64 Zeichen aus 0–9 und a–f; achten Sie darauf, dass am Anfang und Ende kein Leerzeichen mitkopiert wird.

**C3.** In der App die **Worker-Adresse** aus B6 eintragen. `https://` ist nicht nötig.

**C4.** Auf **„Verbindung testen“** tippen. Die App schickt ein winziges Testbild durch die ganze Kette: App → Worker → Gemini.

- 🟢 **„Verbindung funktioniert“**: Die Einrichtung ist gespeichert. Auf **„Fertig“** tippen.
- 🔴 Eine rote Meldung nennt die Ursache und die Lösung (siehe Tabelle unten). Nach einer Korrektur bei Cloudflare etwa 1 Minute warten und erneut testen.

**C5.** Fertig. Ab jetzt öffnet **„+“ → „Foto aufnehmen“** direkt die Kamera.

---

## Problemlösung

| Meldung in der App | Ursache | Lösung |
|---|---|---|
| **Adresse nicht erreichbar** | Tippfehler in der Adresse oder kein Internet | Adresse aus B6 erneut abschreiben; WLAN/Mobilfunk prüfen |
| **Adresse antwortet nicht wie erwartet** | Unter der Adresse läuft noch „Hello World“ | B4 wiederholen (alles ersetzen, „Deploy“) |
| **Secrets fehlen im Worker** | `GEMINI_API_KEY` oder `APP_TOKEN` fehlt bzw. ist falsch geschrieben | B5 und C2 prüfen: Namen exakt so, Typ *Secret*, danach „Deploy“ |
| **Token stimmt nicht überein** | Bei Cloudflare steht ein anderes Token als in der App | Token in der App erneut kopieren/teilen und in C2 als neuen Wert von `APP_TOKEN` speichern |
| **Gemini lehnt die Anfrage ab** | Gemini-Schlüssel ungültig, unvollständig kopiert oder gelöscht | Neuen Schlüssel in A4/A5 erzeugen und in B5 als `GEMINI_API_KEY` ersetzen |
| **Verbindung funktioniert – Tageslimit erreicht** | Alles richtig, nur das kostenlose Kontingent ist für heute aufgebraucht | Am nächsten Tag wieder nutzen |
| Später beim Foto: **Erkennung fehlgeschlagen** | Google hat das Modell geändert oder abgeschaltet | Siehe „Modell wechseln“ |

**Fehlerprotokoll ansehen** (für Fortgeschrittene): Cloudflare → Worker → Reiter *„Logs“* → *„Begin log stream“*, dann in der App ein Foto senden.

---

## Modell wechseln

Der Worker nutzt standardmäßig `gemini-2.5-flash`. Stellt Google dieses Modell ein, können Sie ein anderes kostenloses Modell wählen (Liste: https://ai.google.dev/gemini-api/docs/pricing). So geht es:

1. Cloudflare → Worker → **Settings** → **Variables and Secrets** → **„+ Add“**.
2. **Type** `Text`, **Variable name** `GEMINI_MODEL`, **Value** z. B. den neuen Modellnamen.
3. Auf **„Deploy“** klicken.

## Sicherheit und Datenschutz

- **Gemini-Schlüssel:** liegt nur verschlüsselt bei Cloudflare, nicht in der App und nicht auf GitHub.
- **App-Token:** wird nur in der App auf Ihrem Handy gespeichert. Kennt es jemand, könnte er höchstens Ihr kostenloses Kontingent verbrauchen; Kosten entstehen nicht. Gegenmittel: In der Einrichtung „Einrichtung entfernen“, neues Token erzeugen und C2 wiederholen.
- **Fotos:** Der Worker speichert keine Fotos und schreibt keine Bilddaten ins Protokoll. Die App speichert nur die bestätigten Einträge, nicht das Foto. Google verarbeitet das Foto zur Erkennung (siehe Datenschutzhinweis in Teil A).

---

## Anhang: Einrichtung per Terminal (für Entwickler)

Statt B2–B6 kann der Worker auch mit der Kommandozeile veröffentlicht werden. Voraussetzung ist Node.js LTS.

```bash
cd backend/recognition-proxy
npm install
npx wrangler login
npx wrangler secret put GEMINI_API_KEY
npx wrangler secret put APP_TOKEN      # Token aus der App (C2)
npx wrangler deploy
```

**Code geändert?** Mit `npm run bundle` wird `dist/worker.js` neu erzeugt (Datei für den Browser-Editor).

**Ohne Einrichtung in der App:** Alternativ lassen sich Adresse und Token zur Build-Zeit setzen. Dazu `.env.example` nach `.env.local` kopieren und ausfüllen. Eine in der App gespeicherte Einrichtung hat Vorrang.
