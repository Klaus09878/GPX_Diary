# Contributing

Vielen Dank für Beiträge zu diesem Projekt.

## Entwicklungs-Setup

1. Repository klonen
2. Portable Runtime pruefen:
   - Erwartet wird `LiveMapApp/runtime/node/node.exe` und `LiveMapApp/runtime/node/npm.cmd`
3. In den App-Ordner wechseln:
   - `cd LiveMapApp`
4. Abhaengigkeiten installieren:
   - `npm install`
5. App starten:
   - `npm start`
6. Tests ausfuehren (optional):
   - `npm test` — führt Basis-Tests aus; neue Tests gehören in `tests/`

Alternative ohne globale Installation:

- Aus dem Repo-Root `start_app.bat` starten. Das Script verwendet die portable Runtime.
- Fuer rein lokale Entwicklerdiagnose ist globaler Fallback moeglich:
   - `set "USE_GLOBAL_NODE_FALLBACK=1"`
  - `start_app.bat`

## Wichtige Regeln

- Keine persönlichen GPX-/Health-Daten committen.
- Keine Dateien aus `LiveMapApp/data/` committen.
- Kein `node_modules` committen.
- Die Runtime unter `LiveMapApp/runtime/node` ist Teil der Distributionsstrategie und darf versionsbezogen aktualisiert werden.
- Änderungen bitte fokussiert und klein halten.

## Testing

- Unit-Tests gehören in `tests/` mit Naming-Convention `*.test.js`
- Vor PR-Submit immer `npm test` ausführen (sollte fehlschlagfrei sein)
- `npm run verify:migration` prüft ESM-Migration und Smoke-Gate
- `npm run verify:portable` prueft portable Runtime, Testlauf und HTTP-Erreichbarkeit

## Pull Requests

- Beschreibe klar: Problem, Lösung, Testschritte.
- Falls UI geändert wurde: Screenshot oder kurze Beschreibung hinzufügen.
- Alle Tests müssen lokal mit `npm test` && `npm run verify:migration` erfolgreich sein
- Prüfe vor dem PR:
  - `git status`
  - `git add -n .`

## Bug Reports

Bitte mitliefern:

- Betriebssystem
- Node-Version (portable oder global; Ausgabe von `node -v`)
- reproduzierbare Schritte
- erwartetes vs. tatsächliches Verhalten
- relevante Konsolen-/Server-Logs
