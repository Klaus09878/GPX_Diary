## Plan: Holistisches Gesundheits- & Trainings-Dashboard

TL;DR
Empfangen, verstanden. Phase 0 liefert extrem detaillierte Architektur- und Implementierungs-Roadmap. Fokus: minimale Eingriffe im bestehenden `server.js` + `MetadataStore` + `public/*`, dabei neuer DB-Schema, sportwissenschaftliche Formeln (TRIMP/ATL/CTL/TSB), ingestions und Frontend-Kacheln.

---

## 1. Empfangsbestätigung

- Spezifikation ist vollständig angekommen.
- Phase 0 wird jetzt als Plan ausgegeben.
- Codestart erst nach deiner Freigabe.

---

## 2. Gesamtarchitektur (Dateien & Module)

### Backend-Kerne
- `server.js`
  - neue API-Routen:
    - `POST /api/upload/health`
    - `POST /api/upload/:profile` erweitert (GPX/FIT + Laufdynamik)
    - `GET /api/training/load` (ATL/CTL/TSB)
    - `GET /api/health/metrics`
    - `GET /api/workouts`
    - `GET /api/workouts/:id`
- `src/server/metadata/MetadataStore.js`
  - neue Tabellen/Methoden.
  - bestehende `activity_notes` weiterhin offen.

### Backend-Hilfskern
- `src/server/core/sportsScience.js` (neu)
  - TRIMP/TSS/Zonen-Logik
  - ATL/CTL/TSB
  - Fokus-Klassifikation
  - Hilfs-Funktionen: EMA, HRZ-Berechnung, Fit-/GPX-Erweiterungen

### Frontend
- `public/app.js`
  - neue Tabs: `Gesundheit`, `Workouts`, `Schlaf`
  - neue Widgets / Charts
  - neue API-Konsumer
  - Kachel-UI-Komponenten (Kachel-Renderer, Wert-Status)
- `public/index.html`
  - Layout: Top/Bottom-Bar
  - Placeholders für neue Cards
- `public/style.css`
  - Deep Dark Theme
  - Glassmorphism

---

## 3. Datenbank-Schema (SQLite SQL)

### Neue Tabelle `workouts`
- id INTEGER PRIMARY KEY AUTOINCREMENT
- date TEXT NOT NULL (ISO 8601)
- type TEXT NOT NULL (Laufen, Rennrad, etc.)
- duration_sec REAL
- distance_km REAL
- elevation_gain_m REAL
- avg_speed REAL
- max_speed REAL
- avg_hr REAL
- max_hr REAL
- avg_power REAL
- max_power REAL
- avg_cadence REAL
- vertical_oscillation REAL
- ground_contact_time REAL
- tss REAL
- trimp REAL
- hr_recovery REAL

### Neue Tabelle `health_metrics`
- date TEXT PRIMARY KEY
- resting_hr REAL
- hrv_ms REAL
- vo2_max REAL
- respiratory_rate REAL
- spo2 REAL
- wrist_temp REAL
- sleep_duration_min REAL
- sleep_quality_pct REAL
- body_battery REAL
- stress_score REAL
- weight_kg REAL
- body_fat_pct REAL
- lean_mass_kg REAL

### Neue Tabelle `hr_zones`
- id INTEGER PRIMARY KEY AUTOINCREMENT
- workout_id INTEGER REFERENCES workouts(id) ON DELETE CASCADE
- z0_sec REAL
- z1_sec REAL
- z2_sec REAL
- z3_sec REAL
- z4_sec REAL
- z5_sec REAL

---

## 4. Sports Science Formeln (exakt) in `sportsScience.js`

### 4.1 HR-Zonen
- Input: `avg_hr`, `max_hr` (190 default)
- Prozentsatz:
  - z0 <50%, z1 50-60%, z2 60-70%, z3 70-80%, z4 80-90%, z5 90-100%
- `timeInZone` aus Zeitproportionen (mit N x 1s HR-Daten; bei Aggregat: Schätzwerte)

### 4.2 TRIMP (Banister)
- `duration_min = duration_sec / 60`
- `hr_ratio = (avg_hr - resting_hr) / (max_hr - resting_hr)`
- stress_factor `y`: Männer 0.64, Frauen 0.86, fallback 0.64
- `trimp = duration_min * hr_ratio * y * exp(1.92 * hr_ratio)`
- falls Watt vorhanden:
  - `tss = (duration_sec * avg_power * 100) / (ftp * 3600)`
- falls nur HR:
  - `tss ≈ trimp / 1.8`

### 4.3 ATL/CTL/TSB (EMA)
- `alpha = 2 / (n + 1)`
- ATL n=7, CTL n=42
- `EMA_today = EMA_prev + alpha * (tss_today - EMA_prev)`
- TSB(today) = CTL(yesterday) - ATL(yesterday)
- fehlende Tage = 0

### 4.4 Trainingsfokus
- Aerob = z1 + z2
- Hoch Aerob = z3 + z4
- Anaerob = z5

---

## 5. API-Verläufe und Abhängigkeiten

Reihenfolge:
1. DB-Schema + MetadataStore Erweiterung
2. `sportsScience.js`
3. `server.js`-Routen
4. Upload-Pipeline (Apple-CSV + Fit/Gpx)
5. Query-API (`/api/training/load`)
6. Frontend-Tab UI + Charts
7. Workout-Detail-Modal

---

## 6. Frontend-Kachel-Details

### Workouts
- TSB-Widget
- Erholung vs Belastung Chart
- Fokus-Stacked-Area
- HR-Zonen Bar
- HR-Erholung
- Training Duration Bar
- Erfolge

### Gesundheit
- Body Energy
- Stress
- Metriken-Grid
- Körperzusammensetzung
- Aktivität

### Schlaf
- Schlafaufnahme
- Schlafqualität
- Detail-Dimensionen

---

## 7. Workout-Detail-Modal
- Fullscreen Overlay
- Map + 3D Toggle
- Steigungsfarbliche Polylines
- Premium Metriken
- synchrone Charts

---

## 8. Ablauf (Schritt-für-Schritt)
1. `MetadataStore` `ensureSchema` + Methoden
2. `sportsScience.js` Funktionen
3. `server.js` API implementieren
4. Upload Pipeline 
5. Frontend Tab + Charts
6. Style + Dark Mode
7. Test & Validierung

---

## 9. Tests
- Backend: Schema, TRIMP/TSS/ATL/CTL/TSB, CSV-Upload
- Frontend: Render, Chart Data

---

## 10. Rollout
- PR in kleinen Schritten
- Optionale Feature-Flag
- Migration Script
- README

---

## 11. Entscheidungspunkte zur Freigabe
- Weiter in `MetadataStore` + `server.js` + Frontend Vanilla
- Ohne externes Auth

> Jetzt ist der vollständige Implementierungsplan fertig.
> Du kannst mir eine der Optionen geben:
> - "Freigabe: starte Phase 1 mit Schema + MetadataStore"
> - "Bitte ändere Plan X"
> - "Stopp und bespreche Detail Y"
