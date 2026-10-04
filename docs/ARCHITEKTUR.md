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
    index.tsx                   Weiche: Profil vorhanden → Dashboard, sonst Onboarding
    onboarding/
      _layout.tsx               Fortschrittsbalken + Zustand des Interviews
      [step].tsx                Eine Frage pro Screen (1–11)
      result.tsx                Ergebnis-Screen mit Plan und Ring-Vorschau
    (tabs)/
      _layout.tsx               Tab-Leiste
      index.tsx                 Dashboard (Ringe, Kalorien, Mahlzeiten)
      history.tsx               Verlauf
      settings.tsx              Profil bearbeiten → Plan neu berechnen
    add/
      scan.tsx                  Barcode-Scanner (Modal)
      photo.tsx                 Foto aufnehmen/auswählen → Vorschlagsliste
      search.tsx                Textsuche (lokal + Open Food Facts)
      portion.tsx               Portionsgröße anpassen, Live-Umrechnung, speichern
      manual.tsx                Manuelle Eingabe (z. B. Barcode nicht gefunden)
  domain/                       Reine Logik, vollständig unit-getestet
    types.ts                    Domänentypen (vorhanden)
    nutrition-plan.ts           BMR, TDEE, Kalorienziel, Makros, Dauer bis Ziel
    portion.ts                  Umrechnung pro 100 g → Portion
    avoid-match.ts              Abgleich mit gemiedenen Lebensmitteln
    onboarding-steps.ts         Fragenkatalog, Überspringlogik, Validierung
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

## 4. Qualitätssicherung

- `npm test` – Jest (Migrationen gegen echtes SQLite, ab Schritt 2 Formeln)
- `npm run typecheck` – TypeScript strict
- `npm run lint` – ESLint (expo-Konfiguration)
