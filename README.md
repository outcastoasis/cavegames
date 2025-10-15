# Spielabend App – Konzeption & Systemüberblick

## 🎯 Ziel der Anwendung

Die Spielabend-App soll einer privaten Gruppe von Freunden ermöglichen, gemeinsame Spieleabende (Brettspiele, Kartenspiele etc.) übers Jahr hinweg zu planen, Punkte zu erfassen und einen Jahresgewinner zu küren. Sie ist mobiloptimiert, modern gestaltet, datenschutzfreundlich und wird nur von einer kleinen festen Benutzergruppe verwendet.

---

## ✅ Kernfunktionen

- 🧑‍🤝‍🧑 Benutzerverwaltung (Admin, Spieler, Spielleiter, Gäste)
- 📅 Planung von Spieleabenden mit Terminabstimmungen (Doodle-artig)
- 🎮 Eintragen gespielter Spiele & individueller Punkte
- 🏆 Tagesgewinner & Jahresgewinner automatisch berechnet
- 🗃️ Spielarchiv mit Detailansicht und Gruppenfotos
- 🏅 Jahresrückblick & Hall of Fame
- 🔐 Login über Benutzernamen & Passwort (ohne E-Mail)
- 📱 Mobiloptimierte Web-App im „Friendly Play“-Stil (inspiriert von Kahoot)

---

## 🧱 Technischer Stack

- **Frontend:** React (Poppins Font, eigener CSS-Stil)
- **Backend:** Node.js + Express
- **Datenbank:** MongoDB Atlas (Cloud)
- **Deployment:** Frontend auf Vercel, Backend auf Railway/Render

---

## 🗺️ Sitemap / Seitenstruktur

- **Startseite / Dashboard**
  - Begrüßung + aktuelles Spieljahr
  - Nächster Abend (Countdown, Details, Abstimmen)
  - Letzter Abend (Datum, Tagessieger, Bild, Button zur Detailansicht)
- **Abende (Liste)** → Neueste oben, mit Datum, Ort, Sieger
- **Abend-Details** → Spiele, Punkte, Bilder, Spielleiter, Gruppenfoto
- **Punkte eintragen** → Nur für Spielleiter/Admin
- **Umfragen** → Terminabstimmungen sichtbar & abstimmbar
- **Jahresrückblick / Hall of Fame** → Gewinner pro Jahr
- **Profilseite (optional)** → Eigene Statistiken, Teilnahmen, Siege
- **Adminbereich**
  - Benutzer verwalten
  - Spieljahr abschließen
  - Rollen zuweisen (Spielleiter pro Abend)
  - Daten exportieren

---

## 🎨 Designkonzept

- **Stil:** „Friendly Play“, inspiriert von Kahoot & Duolingo
- **Farben:** Violett (Primary), Türkis (Secondary), Gelb (Accent), Hellgrau (BG)
- **Font:** [Poppins](https://fonts.google.com/specimen/Poppins)
- **Navigation:** Bottom-Navigation auf Mobilgeräten (Icons + Labels)
- **UI-Komponenten:** Runde Karten, große Buttons, Bild-Uploads pro Abend

---

## 👥 Rollen & Berechtigungen

| Rolle           | Rechte                                                                      |
| --------------- | --------------------------------------------------------------------------- |
| **Admin**       | Alles: Benutzer verwalten, Abende bearbeiten, Punkte erfassen, Jahr beenden |
| **Spielleiter** | Darf Spiele + Punkte beim ihm zugewiesenen Abend bearbeiten                 |
| **Spieler**     | Darf Punkte und Ergebnisse einsehen, an Umfragen teilnehmen                 |
| **Gast**        | Sichtrechte, evtl. Abstimmen, kein Login nötig (später optional)            |

---

## 🧩 Datenbankmodelle (MongoDB)

### 🧑 `users`

```json
{
  "_id": "ObjectId",
  "username": "Max",
  "passwordHash": "hashed_pw",
  "role": "admin",
  "createdAt": "...",
  "active": true
}
```

### 🎲 `games`

```json
{
  "_id": "ObjectId",
  "name": "Uno",
  "imageUrl": "https://...",
  "description": "...",
  "createdBy": "user123",
  "timesPlayed": 7,
  "createdAt": "..."
}
```

### 📅 `evenings`

```json
{
  "_id": "ObjectId",
  "date": "2025-10-06T19:00:00Z",
  "organizerId": "user123",
  "spielleiterId": "user456",
  "participantIds": ["user123", "user456"],
  "spieljahr": 2025,
  "status": "open",

  "games": [
    {
      "gameId": "game456",
      "scores": [
        { "userId": "user123", "points": 10 },
        { "userId": "user456", "points": 6 }
      ],
      "notes": "Zweimal UNO gespielt"
    }
  ],

  "groupPhotoUrl": "https://...",
  "createdAt": "...",
  "updatedAt": "..."
}
```

### (Optional) 🧮 `userStats` _(vorgerechnet)_

```json
{
  "userId": "user123",
  "spieljahr": 2025,
  "totalPoints": 187,
  "totalWins": 5,
  "eveningsAttended": 9
}
```

---

## 🔄 Spielabend-Workflow (finale Version mit nur einem offenen Abend)

### 🧩 Phasenübersicht

1. 🛠️ **Planung durch Admin**
2. 📊 **Umfrage durch Spielleiter**
3. 📆 **Fixierung & Teilnahme durch Spieler**
4. 🎲 **Durchführung & Punkteerfassung**
5. ✅ **Abschluss & Archivierung**

---

### 1. 🛠️ Admin erstellt einen neuen Abend

- Nur **ein offener Abend** gleichzeitig erlaubt
- Wird einem **Spieljahr** zugeordnet
- Ort wird eingetragen (Bsp. Bei User "Anna")
- **Spielleiter** wird eingetragen, Datum bleibt leer
- Status: `offen`
- Spielleiter erhält Meldung: _„Dir wurde ein neuer Abend zur Koordination zugeteilt.“_

---

### 2. 📊 Spielleiter erstellt Umfrage

- Legt mehrere Terminvorschläge an
- Alle Spieler erhalten Benachrichtigung _„Neue Termin-Umfrage verfügbar“_
- Spieler dürfen für **einen oder mehrere Termine abstimmen**
- Nach Entscheidung durch Spielleiter wird Termin fixiert → Status: `fixiert`

---

### 3. 📆 Spieler bestätigen Teilnahme

- Nach Fixierung sehen alle Spieler: **Datum, Uhrzeit, Ort**
- Spieler klicken „Ich nehme teil“ (Eintrag in Teilnehmerliste)
- Optionale Vorab-Spielvorschläge möglich

---

### 4. 🎲 Durchführung & Bearbeitung durch Spielleiter

- Am Abend oder danach:
  - Teilnehmerliste bearbeiten
  - Spiele mit Punkten eintragen (Achtung: Gleichstand von Spieler möglich -> in Auswertung berücksichtigen)
  - Gruppenfoto hochladen
- Abend wird manuell auf `abgeschlossen` gesetzt
- Sieger wird automatisch ermittelt (höchste Punktzahl)

---

### 5. ✅ Abschluss durch Admin

- Admin prüft und **sperrt den Abend**
- Abend wird in die **Historie** übernommen
- Jahresstatistik (`userStats`, `gameStats`) wird aktualisiert (Achtung: Gleichstand von Spieler möglich -> Berücksichtigen)

---

### 🔐 Status-Übersicht

| Status          | Beschreibung                       | Verantwortlich    |
| --------------- | ---------------------------------- | ----------------- |
| `offen`         | Abend angelegt, Umfrage ausstehend | Admin/Spielleiter |
| `fixiert`       | Datum steht fest, Teilnahme läuft  | Spielleiter       |
| `abgeschlossen` | Abend durchgeführt, Punkte erfasst | Spielleiter       |
| `gesperrt`      | Final archiviert                   | Admin             |

---

## 📌 Noch zu definieren / offen:

- [ ] Datenmodell für **Umfragen** (Terminplanung)
- [ ] Datenmodell für **Spieljahre** (z. B. Abschluss, Ranking-Cache)
- [ ] Berechnung von **Live-Statistiken** (Leaderboard API, Tageswertung, etc.)
- [ ] Spezifikation der **API-Routen** (z. B. `/api/abend/:id/spiel`)
- [ ] Upload-/Speicherstrategie für Bilder (Spiele & Gruppenfotos)
- [ ] Optionale **Benachrichtigungen** (z. B. neue Umfrage, Punkte fehlen)

---

## ✅ Nächste empfohlene Schritte

1. 🔧 Datenmodell `polls` (Umfragen) entwerfen
2. ⚙️ Spieljahr-Verwaltung (Abschluss, Archivierung, Gewinnerfreigabe)
3. 🧪 API-Definition & Mock-Daten erstellen
4. 🧱 Backend-Setup & Testdaten einfügen
5. 🎨 Skizzierung / Umsetzung weiterer Seiten nach Bedarf

---

## 📂 Lizenz & Hinweise

Private Freizeit-App, nicht für öffentliche Nutzung vorgesehen. Copyright beim Entwickler.
