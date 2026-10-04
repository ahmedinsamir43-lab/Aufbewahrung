# Nährwert – Architektur und Datenmodell (Schritt 1)

## 1. Technologieentscheidungen

| Bereich | Entscheidung | Begründung |
|---|---|---|
| Framework | Expo SDK 57, React Native 0.86, TypeScript (strict) | Aktuelle stabile SDK-Version; Continuous Native Generation – `android/` wird aus `app.json` erzeugt und nicht eingecheckt. |
| Navigation | expo-router (dateibasiert, `src/app/`) | Typisierte Routen, Modals und Tabs ohne manuelle Navigator-Konfiguration. |
| Persistenz | expo-sqlite, Migrationen über `PRAGMA user_version` | Relationale Abfragen für Tages- und Verlaufsaggregation; Schema in einer Datei, testbar mit `node:sqlite`. |
| Domänenlogik | Reines TypeScript in `src/domain/` | Formeln (BMR, TDEE, Makros, Portionsumrechnung) ohne UI-Abhängigkeit → schnelle Unit-Tests mit Jest. |
| Barcode | expo-camera (`CameraView`, `barcodeScannerSettings`) | Integrierter Scanner, keine Zusatzbibliothek. |
| Foto-Erkennung | Claude Vision über Backend-Proxy (`backend/`) | API-Key verbleibt serverseitig. |
| Ringe | react-native-svg + react-native-reanimated | Animierte Kreisbögen über `strokeDashoffset`. |
| Netzwerkstatus | @react-native-community/netinfo | Erkennung „offline" → Scan-Warteschlange. |
| Build | Development Build (`npx expo run:android`) bzw. EAS Build (APK) | Expo Go genügt für Phase 1, Health Connect (Phase 2) erfordert aber ohnehin einen Development Build. |

## 2. Ordnerstruktur (Zielbild)

```
src/
  app/                          Routen (expo-router) – nur Screens, keine Logik
    _layout.tsx                 Root: Theme, SQLiteProvider, Stack
    onboarding/
      _layout.tsx               Zustand des Interviews (Provider, Entwurf in SQLite)
      index.tsx                 Eine Frage pro Ansicht (1–11), Fortschrittsbalken
      result.tsx                Ergebnis-Screen mit Plan und Ring-Vorschau
    (tabs)/
      _layout.tsx               Tab-Leiste; ohne Profil → Weiterleitung zum Onboarding
      index.tsx                 Dashboard (Ringe, Kalorien, Mahlzeiten)
      history.tsx               Verlauf
      settings.tsx              Profil bearbeiten → Plan neu berechnen
    add/                        Modal-Stack für die Erfassung
      search.tsx                Textsuche (lokal; Open Food Facts ab Schritt 4)
      manual.tsx                Manuelle Eingabe (pro 100 g, mit Plausibilitätsprüfung)
      portion.tsx               Portion/Mahlzeit wählen, Live-Umrechnung; auch Bearbeiten/Löschen
      scan.tsx                  Barcode-Scanner (Schritt 4)
      photo.tsx                 Foto aufnehmen → Vorschlagsliste (Schritt 5)
  domain/                       Reine Logik, vollständig unit-getestet
    types.ts                    Domänentypen (vorhanden)
    nutrition-plan.ts           BMR, TDEE, Kalorienziel, Makros, Dauer bis Ziel
    portion.ts                  Umrechnung pro 100 g → Portion, Tagessummen, Kalorienbilanz
    meals.ts                    Mahlzeiten, Vorauswahl nach Uhrzeit
    food-validation.ts          Validierung manueller Lebensmittel (Atwater-Plausibilität)
    dates.ts                    Lokale Kalendertage, Tagesbeschriftung
    avoid-match.ts              Abgleich mit gemiedenen Lebensmitteln
    onboarding.ts               Schrittfolge, Überspringlogik, Validierung
    ring.ts                     Füllgrad und Überschreitung der Makro-Ringe
    format.ts                   Zahlenformat (de-DE)
  db/
    schema.ts                   Migrationen (vorhanden, getestet)
    client.ts                   Initialisierung (vorhanden)
    repositories/               profile, plan, food, log, pending-scan
  services/
    open-food-facts.ts          Produktabfrage per Barcode, Textsuche, Mapping
    recognition.ts              Aufruf des Proxys, Schema-Validierung der Antwort
    sync-pending-scans.ts       Abarbeitung der Offline-Warteschlange
  components/                   UI-Bausteine: Card, Button, MacroRing, ProgressBar …
  theme/                        Design-Tokens, Hell-/Dunkelmodus (vorhanden)
backend/
  recognition-proxy/            Proxy für Claude Vision (Schritt 5)
docs/                           Architektur, Installationsanleitung
```

## 3. Datenmodell

```
profile (genau 1 Zeile)            nutrition_plan (versioniert)
  first_name, age_years, sex,        valid_from, bmr, tdee, kcal_target,
  height_cm, weight_kg, goal,        carbs/protein/fat_g, …_pct,
  target_weight_kg?, activity,       floor_applied, protein_reference_kg,
  pace?, diet_style,                 est_weeks_to_target?
  avoid_foods (JSON), health_note?
                                   food (lokaler Katalog)
log_entry (Tagesprotokoll)           source, barcode (UNIQUE)?, name, brand?,
  date, meal, food_id? ──────────▶   kcal/carbs/protein/fat_100g,
  name, amount_g,                    default_portion_g?, ingredients_text?,
  kcal, carbs/protein/fat_g,         is_favorite, last_used_at?
  source, is_estimate,
  confidence?                      pending_scan (Offline-Warteschlange)
                                     barcode, date, meal, status, attempts
app_setting (Schlüssel/Wert)
```

Zentrale Modellierungsentscheidungen:

1. **Momentaufnahme im Protokoll.** `log_entry` speichert Name und berechnete Nährwerte der konkreten Portion. Wird ein Lebensmittel später korrigiert oder gelöscht (`ON DELETE SET NULL`), bleibt die Historie unverändert.
2. **Versionierte Pläne.** Jede Profiländerung erzeugt einen neuen `nutrition_plan` mit `valid_from`. Der Verlauf bewertet jeden Tag gegen den damals gültigen Plan.
3. **Nährwerte pro 100 g** im Katalog (Konvention von Open Food Facts); die Portionsumrechnung erfolgt ausschließlich in `domain/portion.ts`.
4. **Ein Katalog für alle Quellen.** Open-Food-Facts-Treffer werden lokal zwischengespeichert, manuell angelegte Produkte (z. B. unbekannter Barcode) landen in derselben Tabelle; Favoriten sind ein Flag.
5. **Foto-Ergebnisse** werden nie automatisch gespeichert. Erst nach Bestätigung im Vorschlags-Screen entsteht ein `log_entry` mit `source = 'photo'`, `confidence` und ggf. `is_estimate = 1`.
6. **Integrität in der Datenbank.** CHECK-Constraints für Enumerationen und Wertebereiche, eindeutige Barcodes, Indizes auf Datum/Mahlzeit.

## 4. Festgelegte fachliche Entscheidungen (Schritt 2)

| Thema | Entscheidung |
|---|---|
| Frage 11 | Zwei Felder: „Lebensmittel meiden" (Schlagwörter, kommagetrennt) und „Gesundheitliche Notiz". Nur die Notiz löst den Hinweis zur ärztlichen Abklärung aus. |
| Eiweiß bei BMI > 30 | Referenz = Zielgewicht; bei „halten" (kein Zielgewicht) das Gewicht bei BMI 25. |
| Keto | Kohlenhydrate fest 30 g/Tag. |
| Rundung | BMR und TDEE werden gerundet, bevor Kalorienziel und Makros berechnet werden; Prozentanteile aus den gerundeten Grammwerten. |
| Untergrenze | `max(BMR, 1.500 kcal ♂ / 1.200 kcal ♀)`; der Hinweis nennt die greifende Grenze. |
| Makro-Konflikt | Übersteigen Eiweiß und fester Anteil das Kalorienziel, wird der Rest auf 0 g begrenzt und ein Hinweis angezeigt. |
| Plausibilität | Alter 18–100 (Mifflin-St Jeor ist für Erwachsene validiert), Größe 120–230 cm, Gewicht 35–300 kg; Zielgewicht beim Abnehmen nicht unter BMI 18,5 (WHO-Grenze Untergewicht). |
| Dauer bis Ziel | `|Δkg| × 7.700 / |Tagesbilanz|`, in Wochen gerundet (mindestens 1); als Schätzung gekennzeichnet. |
| Foto-Proxy (Schritt 5) | Cloudflare Worker, API-Key als Secret, Absicherung über App-Token. |

**Persistenz.** Ein unterbrochenes Onboarding wird als Entwurf in `app_setting` gesichert und beim nächsten Start an derselben Frage fortgesetzt. Profil und Plan werden in einer Transaktion gespeichert; danach wird der Entwurf entfernt.

**Gestaltung.** Schrift *Plus Jakarta Sans*, Icons *Material Symbols* (über expo-symbols), haptisches Feedback (expo-haptics), Animationen mit Reanimated (Federn, gestaffelte Einblendungen, animierte Ringe). Die Ringgröße passt sich der Bildschirmbreite an (72–112 px).

## 5. Fahrplan (aktualisiert)

| Schritt | Inhalt | Status |
|---|---|---|
| 1 | Projekt, Struktur, Datenmodell | erledigt |
| 2 | Onboarding, Berechnung, Unit-Tests | erledigt |
| 3 | Dashboard, Tagesprotokoll, „+"-Button, Portionsauswahl, lokale Suche, manuelle Eingabe | erledigt |
| 4 | Barcode-Scanner, Open Food Facts (Barcode und Textsuche), Offline-Warteschlange | erledigt |
| 5 | Foto-Erkennung über Cloudflare-Worker-Proxy | offen |
| 6 | Verlauf, Einstellungen, **Gewichtsverlauf** mit Diagramm zum Zielgewicht, Feinschliff | offen |
| 7 | **Samsung Health über Android Health Connect**: Schritte, Trainings und Aktivitätskalorien lesen, Gewicht synchronisieren | offen |
| 8 | Installationsanleitung (USB-Debugging / APK über EAS Build) | offen |

**Anmerkung zu Schritt 7.** Samsung Health stellt Daten auf Android über Health Connect bereit; eine direkte Samsung-Schnittstelle ist für Drittanbieter-Apps nicht vorgesehen. Health Connect ist ein natives Modul und erfordert daher einen Development Build bzw. eine APK (nicht Expo Go). **Entscheidung:** Aktivitätskalorien werden nur angezeigt und erhöhen das Tagesziel nicht, da der Aktivitätsfaktor sportliche Aktivität bereits enthält (Vermeidung einer Doppelzählung).

## 6. Barcode und Open Food Facts (Schritt 4)

**Ablauf eines Scans.**
1. Prüfung der GS1-Prüfziffer; Fehllesungen werden verworfen, der Scanner läuft weiter.
2. Normalisierung: UPC-A → EAN-13 (führende 0), UPC-E → UPC-A → EAN-13.
3. Abfrage zuerst im lokalen Katalog. Das funktioniert offline und erkennt auch selbst angelegte Produkte.
4. Danach Abfrage über `GET /api/v2/product/{barcode}.json` mit Feldauswahl. Treffer werden lokal gespeichert.

**Ergebnisfälle.**
- *Gefunden:* weiter zur Portionsauswahl, mit der Packungsportion als Vorschlag.
- *Unvollständig oder unplausibel:* manuelle Ergänzung, vorausgefüllt mit Name und Marke.
- *Nicht gefunden:* manuelle Anlage mit Barcode; beim nächsten Scan wird das Produkt sofort erkannt.
- *Offline* (Verbindungsfehler, Zeitüberschreitung nach 8 s, HTTP 429 oder 5xx): Eintrag in `pending_scan`.

**Offline-Warteschlange.** Beim Öffnen des Dashboards und bei jedem Verbindungswechsel (NetInfo) werden wartende Scans abgerufen. Gefundene Produkte erscheinen als „Gespeicherte Scans“ und werden erst nach Wahl der Portion protokolliert, nie automatisch. Der erste Netzwerkfehler bricht die Abarbeitung ab.

**Mapping.**
- Name: deutsch bevorzugt; Marke: erste genannte.
- Energie: aus kcal, sonst aus kJ (÷ 4,184), sonst nach Atwater.
- Plausibilitätsgrenzen wie bei der manuellen Eingabe.
- Allergen- und Spuren-Tags werden ins Deutsche übersetzt und an die Zutaten angehängt, damit der Abgleich mit gemiedenen Lebensmitteln greift (z. B. `en:peanuts` → „Erdnüsse“).

**Textsuche.** Über `de.openfoodfacts.org/cgi/search.pl`, nur auf ausdrückliche Nutzeraktion, weil Open Food Facts 10 Suchanfragen pro Minute erlaubt. Angezeigt werden nur Produkte mit vollständigen Nährwerten. Erst ein ausgewählter Treffer wird gespeichert.

**Datenqualität.** Open Food Facts wird von der Community gepflegt (Lizenz ODbL); die App weist darauf hin, die Werte mit der Verpackung abzugleichen. Selbst angelegte Produkte haben Vorrang und werden durch Online-Daten nie überschrieben.

## 7. Qualitätssicherung

- `npm test` – Jest: Formeln, Interviewlogik, Portionen, Ringzustand, Abgleich gemiedener Lebensmittel, Barcode-Prüfziffern, Open-Food-Facts-Mapping, Offline-Warteschlange, Formatierung, Migrationen und Repositories (gegen echtes SQLite)
- `npm run typecheck` – TypeScript strict
- `npm run lint` – ESLint (expo-Konfiguration, inkl. React-Compiler-Regeln)
- Web-Vorschau (`npx expo start --web`) für schnelle visuelle Kontrollen; `metro.config.js` aktiviert dafür WebAssembly für expo-sqlite
