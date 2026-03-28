# Contributing

Vielen Dank für Beiträge zu diesem Projekt.

## Entwicklungs-Setup

1. Repository klonen
2. In den App-Ordner wechseln:
   - `cd LiveMapApp`
3. Abhängigkeiten installieren:
   - `npm install`
4. App starten:
   - `npm start`
5. Tests ausführen (optional):
   - `npm test` — führt Basis-Tests aus; neue Tests gehören in `tests/`

## Wichtige Regeln

- Keine persönlichen GPX-/Health-Daten committen.
- Keine Dateien aus `LiveMapApp/data/` committen.
- Kein `node_modules` committen.
- Änderungen bitte fokussiert und klein halten.

## Testing

- Unit-Tests gehören in `tests/` mit Naming-Convention `*.test.js`
- Vor PR-Submit immer `npm test` ausführen (sollte fehlschlagfrei sein)
- `npm run verify:migration` prüft ESM-Migration und Smoke-Gate

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
- Node-Version (`node -v`)
- reproduzierbare Schritte
- erwartetes vs. tatsächliches Verhalten
- relevante Konsolen-/Server-Logs
