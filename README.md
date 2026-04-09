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

- Windows-Version: keine lokale Node.js-Installation notwendig, wenn `LiveMapApp/runtime/node` enthalten ist.
- Internetverbindung fuer Karten-/CDN-Komponenten.

Empfohlene Runtime-Policy:

- Mitgelieferte Runtime: Node 20 LTS (Major-Pin).
- Lokales Node.js ist optional und nur fuer Entwicklungsfallback gedacht.

## Schnellstart (Windows, ohne eigene Node-Installation)

Im Projekt-Hauptordner:

1. Doppelklick auf `start_app.bat`
2. Das Script verwendet die mitgelieferte Runtime unter `LiveMapApp/runtime/node`
3. Bei erstem Start werden die Abhaengigkeiten automatisch installiert

Danach im Browser oeffnen:

- `http://localhost:3000`

## Schnellstart (Entwicklung mit lokal installiertem Node, optional)

```bash
cd LiveMapApp
npm install
npm start
```

## Schnellstart (Windows mit Batch-Datei)

Im Projekt-Hauptordner:

- Doppelklick auf `start_app.bat`

Das Skript:

- wechselt automatisch in `LiveMapApp`
- verwendet priorisiert die portable Runtime aus `LiveMapApp/runtime/node`
- installiert bei Bedarf `node_modules` mit portablem npm
- öffnet den Browser auf `http://localhost:3000`

Wenn die Runtime fehlt, bricht das Script mit klarer Meldung ab.
Nur fuer Entwickler kann ein globaler Fallback erzwungen werden:

```bat
set "USE_GLOBAL_NODE_FALLBACK=1"
start_app.bat
```

Portable Runtime Verifikation:

```bash
cd LiveMapApp
npm run verify:portable
```

Details zur Pflege der Runtime stehen in `LiveMapApp/runtime/README_NODE_RUNTIME.md`.

## Optional: Buy Me a Coffee

- Ein optionaler Support-Button wird in der Topbar sowie im Startup-/First-Boot-Overlay (unten mittig) angezeigt, wenn eine URL gesetzt ist.
- Dafür beim Start die Umgebungsvariable `BUY_ME_A_COFFEE_URL` (oder alternativ `SUPPORT_URL`) setzen.
- Optional für GitHub-Profil/Repository: `.github/FUNDING.yml` enthält den Support-Link für die GitHub-Sponsor-Fläche.

PowerShell (Windows):

```powershell
$env:BUY_ME_A_COFFEE_URL="https://buymeacoffee.com/Klaus09878"
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
- **Portable Runtime fehlt:** Stelle sicher, dass `LiveMapApp/runtime/node/node.exe` und `LiveMapApp/runtime/node/npm.cmd` vorhanden sind.
- **Leere Karte/Teile fehlen:** Internetverbindung prüfen (CDN/Karten-Tiles).

## Für GitHub-Upload (Checkliste)

1. Prüfen, dass keine persönlichen Daten unter `LiveMapApp/data/` gestaged sind.
2. `node_modules` nicht committen.
3. `git add -n .` zur Vorschau verwenden.
4. Erst danach committen und pushen.

## Lizenz

Dieses Projekt steht unter der **GNU GPL v3**. Siehe `LICENSE`.
