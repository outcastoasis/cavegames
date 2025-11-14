# UserStats / UserDetail Seite -- Technische Spezifikation

## Prompt

Bitte erstelle die neue Seite UserStats.jsx basierend auf folgender Spezifikation:
Route: /users/:id/stats?year=YYYY
Backend-API: GET /api/stats/user/:id?year=YYYY
Anzeigen:
-Gesamtpunkte
-Anzahl Abende
-Durchschnittspunkte
-Gewinnrate (%)
-Platzierungsverteilung (1./2./3./Rest)
-Bestes Ergebnis
-Schlechtestes Ergebnis
-Punktetrend-Streak-Diagramm
-Tabelle aller Abende des Users mit Punkten & Platzierung
Zusätzlich eine optionale Sektion „Spielestatistiken“:
-Spieleliste, Durchschnitt pro Spiel, Anzahl Spiele, Top-3-Quote.
Header:
-Jahr-Dropdown
-Buttons Vorjahr/Nächstes Jahr
Optional Multi-Year-View:
-Verlauf aller Jahre (Linienchart)
Admin-Seite Erweiterungen:
-In /admin/years Buttons:
--„Jahresstatistik berechnen“
--„Leaderboard anzeigen“
--Info: Abende abgeschlossen, Stats generiert, letzter RebuildZeitpunkt
Bitte alle Daten über die API laden, alle Diagramme mit Beispieldaten mocken, falls nötig.

Implementiere die gesamte Seite modern, responsive und auf Basis der vorhandenen variables.css.

## Zweck der Seite

Diese Seite zeigt alle statistischen Auswertungen eines einzelnen Users,
gefiltert nach Jahr oder über mehrere Jahre hinweg. Sie dient als
Grundlage für Leaderboards, Jahresanalysen und historische Auswertungen.

## Routen

### Frontend

- `/users/:id/stats?year=YYYY`

### Backend

- `GET /api/stats/user/:id?year=YYYY`
- Optional historische Jahre:
  - `/api/stats/user/:id?year=2023`
  - `/api/stats/user/:id?year=2022`

## Daten, die angezeigt werden müssen

### Kernstatistiken

- Gesamtpunkte des Users im Jahr
- Anzahl Abende
- Durchschnittspunkte
- Gewinnrate (%)
- Platzierungsverteilung (1./2./3./Rest)
- Bestes Ergebnis (Datum, Punkte, Platzierung)
- Schlechtestes Ergebnis (Datum, Punkte, Platzierung)
- Punktetrend/Streak-Diagramm (optional)
- Tabelle aller eigenen Abende
- Spielestatistiken (optional Phase 3)

## Seite: UserStats.jsx

### Header

- Benutzername
- Jahr-Dropdown (aktives Jahr vorausgewählt)
- Buttons:
  - Vorheriges Jahr
  - Nächstes Jahr
  - "Alle Jahre" (optional Multi-Year View)

### KPI-Karten

- Gesamtpunkte
- Durchschnittspunkte
- Anzahl Abende
- Gewinnrate
- Top-3 Quote
- Beste Platzierung

### Diagramme

1.  **Platzierungsverteilung (Bar/Pie)**
2.  **Punktetrend/Streak-Diagramm (Linechart)**

### Bestes/Schlechtestes Ergebnis

- Zwei Karten
- Mit Links zu AbendDetail

### Einzelergebnisse Tabelle

- Datum
- Punkte
- Platz
- Link zu AbendDetail

### Spielestatistiken (optional Phase 3)

- Durchschnitt pro Spiel
- Anzahl Spiele
- Top‑3‑Quote
- Ranking nach Performance

## Multi‑Year‑View (optional)

Route: - `/users/:id/stats/all`

Anzeige: - Punkteverlauf über alle Jahre - Veränderung der Gewinnrate -
Aktivitäts-Heatmap

## Admin-Erweiterungen (optional)

### Seite: `/admin/years`

Neue Elemente: - Button „Jahresstatistik berechnen" - Button
„Leaderboard anzeigen" - Info-Karten: - Anzahl Abende im Jahr - Anzahl
abgeschlossene Abende - Statistiken generiert: JA/NEIN - Letzter
Rebuild‑Zeitstempel

## Zusammenfassung der API-Aufrufe

---

Zweck Route

---

Userstats eines Jahres `GET /api/stats/user/:id?year=YYYY`

Multi-Year Stats `GET /api/stats/user/:id?all=true`
(optional)

Jahresstatistiken neu `POST /api/stats/rebuild/year/:year`
berechnen

Jahresliste `GET /api/years`

---
