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

| Rolle        | Rechte |
|--------------|--------|
| **Admin**    | Alles: Benutzer verwalten, Abende bearbeiten, Punkte erfassen, Jahr beenden |
| **Spielleiter** | Darf Spiele + Punkte beim ihm zugewiesenen Abend bearbeiten |
| **Spieler**  | Darf Punkte und Ergebnisse einsehen, an Umfragen teilnehmen |
| **Gast**     | Sichtrechte, evtl. Abstimmen, kein Login nötig (später optional) |

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

### (Optional) 🧮 `userStats` *(vorgerechnet)*
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

## 📌 Noch zu definieren / offen:

- [ ] Datenmodell für **Umfragen** (Terminplanung)
- [ ] Datenmodell für **Spieljahre** (z. B. Abschluss, Ranking-Cache)
- [ ] Berechnung von **Live-Statistiken** (Leaderboard API, Tageswertung, etc.)
- [ ] Spezifikation der **API-Routen** (z. B. `/api/abend/:id/spiel`)
- [ ] Auswertungshandling: Punkte manuell anpassbar? Spiele editierbar?
- [ ] Upload-/Speicherstrategie für Bilder (Spiele & Gruppenfotos)

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
