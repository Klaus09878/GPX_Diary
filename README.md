# Live Map Diary

Lokale Web-App zur Verwaltung und Analyse von Touren/Trainingsdaten (GPX/FIT/Health CSV) mit Kartenansicht, Statistiken und Import-Funktionen.

## Empfohlene GitHub-About-Daten

- Description (Standard): Interaktives GPX/FIT-Trainingstagebuch mit Live-Karte, Aktivitätsanalyse und persönlichen Leistungsstatistiken.
- Topics: gpx, fit, gps-tracking, leaflet, training, sports-analytics, dashboard, nodejs, express, health-data

## Komoot GPX-Download

- Für den Download von GPX-Dateien direkt aus Komoot wird aktuell ein externes Skript benötigt: https://github.com/timschneeb/KomootGPX
- Dieses Projekt verarbeitet und analysiert die exportierten Dateien lokal.
- Eine direkte Komoot-Integration kann später ergänzt werden (z. B. als separater Import-Service/CLI-Worker).

## Projektstruktur

- `start_app.bat` – Windows-Komfortstart (öffnet Browser + startet Server)
- `LiveMapApp/` – eigentliche App (Server, Frontend, Node-Abhängigkeiten)

## Voraussetzungen

- Node.js LTS (empfohlen: v20+)
- npm
- Internetverbindung für Karten-/CDN-Komponenten

## Schnellstart (alle Plattformen)

```bash
cd LiveMapApp
npm install
npm start
```

Danach im Browser öffnen:

- `http://localhost:3000`

## Schnellstart (Windows mit Batch-Datei)

Im Projekt-Hauptordner:

- Doppelklick auf `start_app.bat`

Das Skript:

- wechselt automatisch in `LiveMapApp`
- installiert bei Bedarf `node_modules`
- öffnet den Browser auf `http://localhost:3000`

## Optional: Buy Me a Coffee

- Ein optionaler Support-Button wird in der Topbar angezeigt, wenn eine URL gesetzt ist.
- Dafür beim Start die Umgebungsvariable `BUY_ME_A_COFFEE_URL` (oder alternativ `SUPPORT_URL`) setzen.

PowerShell (Windows):

```powershell
$env:BUY_ME_A_COFFEE_URL="https://buymeacoffee.com/deinname"
cd LiveMapApp
npm start
```

## Daten & Datenschutz

- Persönliche Daten werden **nicht** versioniert.
- Der Ordner `LiveMapApp/data/` ist in Git ignoriert.
- Die Datei `LiveMapApp/data/app-metadata.sqlite` (lokale Metadaten) wird ebenfalls nicht committed.

Wenn du eigene Trainingsdaten nutzen willst, lege sie lokal in `LiveMapApp/data/<profil>/` ab.

Standardprofile:

- `motorrad`
- `rennrad`
- `laufen`
- `spazieren`

## Häufige Probleme

- **Port 3000 belegt:** Prozess auf Port 3000 beenden oder `PORT` setzen.
- **Node nicht gefunden:** Node.js LTS installieren und erneut starten.
- **Leere Karte/Teile fehlen:** Internetverbindung prüfen (CDN/Karten-Tiles).

## Für GitHub-Upload (Checkliste)

1. Prüfen, dass keine persönlichen Daten unter `LiveMapApp/data/` gestaged sind.
2. `node_modules` nicht committen.
3. `git add -n .` zur Vorschau verwenden.
4. Erst danach committen und pushen.

## Lizenz

Dieses Projekt steht unter der **GNU GPL v3**. Siehe `LICENSE`.
