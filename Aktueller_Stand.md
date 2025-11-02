# 📊 Projektfortschritt – Spielabend App

**Datum:** 02.11.2025

## ✅ Erledigte Arbeiten (2. November 2025)

### 🔧 Backend

- `Evening`-Modell final erstellt mit allen nötigen Feldern (`spielleiterId`, `participantIds`, `games`, `pollId`, etc.)
- Controller-Funktionen für `/evenings`:

  - `getEvenings`, `getEveningById`, `createEvening`, `updateEvening`, `deleteEvening`, `changeEveningStatus`
  - Mit `populate()`-Logik für `spielleiterRef`, `participantRefs`, `scores.userName`
  - Validierung: Nur ein offener Abend pro Jahr erlaubt

- Authentifizierung & Rollenprüfung aktiviert über Middleware

### 🖥️ Frontend

#### 📋 Abende.jsx

- Neue Seite zur Anzeige aller Abende
- Admins sehen Button „+ Neuer Abend“
- Modal für Abend-Erstellung (Jahr + Spielleiter)
- Sortierte Listenanzeige mit Datum/Status/Teilnehmern/Spielen

#### 📄 AbendDetail.jsx

- Detailansicht pro Abend mit:
  - Titel, Datum (oder „Umfrage läuft…“), Spielleitername, Ort, Status
  - Teilnehmerliste, Spieleliste, Gruppenfoto
  - Bedingte Buttons:
    - „Spiel hinzufügen“ (Admin + Spielleiter)
    - „Umfrage erstellen“ (nur Spielleiter bei Status „offen“)
- Berechtigungslogik repariert (Buttons erscheinen wieder korrekt)

---

## 🔜 Nächste Schritte

### 🎮 Spiel hinzufügen

- Modal oder neue Seite für Eingabe eines Spiels (Name, Teilnehmer, Punkte)
- API-Aufruf zum Speichern
- Spieleliste aktualisieren

### 📅 Umfrage erstellen

- Modal zur Erfassung mehrerer Terminvorschläge
- Erstellung eines `Poll`-Objekts, Verknüpfung über `pollId`
- Anzeige für Teilnehmer zur Abstimmung

### ✉️ Benachrichtigungen (optional)

- Info an Spielleiter bei neuer Zuordnung
- Info an Teilnehmer bei Umfrageaktivierung

---

## 🛠️ ToDos

- [ ] Model: `Poll.js` erstellen
- [ ] `pollRoutes.js` + Controller einrichten
- [ ] Voting-Komponente im Frontend
- [ ] Validierung im Backend: Nur ein offener Abend + 1 Umfrage erlaubt
- [ ] Erweiterung der Abend-Detailseite mit dynamischem Poll-Status
