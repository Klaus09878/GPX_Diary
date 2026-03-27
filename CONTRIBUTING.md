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

## Wichtige Regeln

- Keine persönlichen GPX-/Health-Daten committen.
- Keine Dateien aus `LiveMapApp/data/` committen.
- Kein `node_modules` committen.
- Änderungen bitte fokussiert und klein halten.

## Pull Requests

- Beschreibe klar: Problem, Lösung, Testschritte.
- Falls UI geändert wurde: Screenshot oder kurze Beschreibung hinzufügen.
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
