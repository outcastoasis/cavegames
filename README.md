# 🎲 Spielabend App – Konzeption & Systemüberblick

## 🎯 Ziel der Anwendung

Die **Spielabend-App** ermöglicht einer privaten Freundesgruppe, gemeinsame Spieleabende (Brettspiele, Kartenspiele etc.) zu planen, Punkte zu erfassen und am Jahresende automatisch den Gewinner zu küren.  
Die Anwendung ist **mobiloptimiert**, **modern gestaltet**, **datenschutzfreundlich** und wird ausschliesslich von einer kleinen, geschlossenen Benutzergruppe verwendet.

---

## ✅ Kernfunktionen

- 🧑‍🤝‍🧑 Benutzerverwaltung (Admin, Spieler, Spielleiter, Gäste)
- 📅 Planung von Spieleabenden mit Termin-Umfragen (ähnlich Doodle)
- 🎮 Erfassen gespielter Spiele & individueller Punkte
- 🏆 Automatische Berechnung von Tages- und Jahresgewinnern
- 🗃️ Archivierung von Abenden mit Detailansicht & Gruppenfoto
- 🏅 Jahresrückblick & Hall of Fame
- 🔐 Login über Benutzername & Passwort (ohne E-Mail)
- 📱 Mobiloptimierte Oberfläche im „Friendly Play“-Stil (inspiriert von Kahoot)

---

## 🧱 Technischer Stack

- **Frontend:** React (mit eigener CSS-Architektur & Poppins-Font)
- **Backend:** Node.js + Express
- **Datenbank:** MongoDB Atlas (Cloud)
- **Deployment:** Frontend über Vercel, Backend über Railway/Render
- **Bildspeicher:** Cloudinary (CDN + URL-Referenzen)

---

## Lokal starten

### 1. Abhängigkeiten installieren

Im Projektroot:

```powershell
npm install
npm --prefix backend install
npm --prefix frontend install
```

### 2. Backend konfigurieren

Datei `backend/.env` anlegen:

```env
PORT=5000
MONGODB_URI=mongodb+srv://...
JWT_SECRET=dev-secret-irgendwas-langes
CLIENT_ORIGIN=http://localhost:5173

CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

`MONGODB_URI`, `JWT_SECRET` und `CLIENT_ORIGIN` werden für den lokalen Start benötigt. Die Cloudinary-Werte werden für Bild-Uploads verwendet.

### 3. Frontend konfigurieren

Datei `frontend/.env` anlegen:

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

### 4. Frontend und Backend starten

Im Projektroot:

```powershell
npm run dev
```

Das startet parallel:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`

Backend-Test:

```text
http://localhost:5000/api/test
```

---

## 🧱 Strukturvorlage (Beispiel)

```
spielabend-app/
│
├── backend/
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── middleware/
│   ├── config/
│   ├── utils/
│   ├── server.js
│   ├── .env
│   ├── package.json
│   ├── README.md
│
│
├── frontend/
│   ├── public/
│   │   ├── index.html
│   │   ├── manifest.json
│   │   └── icons/
│   │
│   ├── src/
│   │   ├── assets/
│   │   │   ├── images/
│   │   │   └── fonts/
│   │   │
│   │   ├── components/
│   │   │   ├── ui/
│   │   │   ├── forms/
│   │   │   ├── charts/
│   │   │   └── common/
│   │   │
│   │   ├── pages/
│   │   │   ├── Home.jsx
│   │   │   ├── Evenings.jsx
│   │   │   ├── EveningDetail.jsx
│   │   │   ├── Polls.jsx
│   │   │   ├── Leaderboard.jsx
│   │   │   ├── Admin.jsx
│   │   │   ├── Login.jsx
│   │   │   └── Register.jsx
│   │   │
│   │   ├── layouts/
│   │   │   ├── DashboardLayout.jsx
│   │   │   ├── AdminLayout.jsx
│   │   │   └── AuthLayout.jsx
│   │   │
│   │   ├── context/
│   │   │   ├── AuthContext.jsx
│   │   │   └── ThemeContext.jsx
│   │   │
│   │   ├── hooks/
│   │   │   ├── useAuth.js
│   │   │   ├── useFetch.js
│   │   │   └── useModal.js
│   │   │
│   │   ├── styles/
│   │   │   ├── variables.css
│   │   │   ├── global.css
│   │   │   ├── components/
│   │   │   └── pages/
│   │   │
│   │   ├── services/
│   │   │   ├── api.js
│   │   │   └── endpoints.js
│   │   │
│   │   ├── App.jsx
│   │   ├── index.js
│   │   └── router.js
│   │
│   ├── .env
│   ├── package.json
│   ├── vite.config.js
│   └── README.md
│
└── README.md (Hauptprojekt)
```

---

## 🗺️ Sitemap / Seitenstruktur

- **Startseite / Dashboard**
  - Begrüssung & aktuelles Spieljahr
  - Nächster Abend (Countdown, Details, Abstimmung)
  - Letzter Abend (Datum, Sieger, Gruppenfoto)
- **Abende (Liste)** → sortiert nach Datum, mit Ort & Siegern
- **Abend-Details** → Spiele, Punkte, Fotos, Spielleiter, Teilnehmer
- **Punkte erfassen** → nur Spielleiter/Admin
- **Umfragen** → Terminabstimmungen mit Auswahl
- **Jahresrückblick / Hall of Fame**
- **Profilseite (optional)** → persönliche Statistiken, Siege, Teilnahmen
  **Adminbereich**
  - 👥 Benutzerverwaltung
  - 📅 Jahre verwalten (inkl. Jahr abschliessen)
  - 📤 Datenexport (optional)

---

## 🎨 Designkonzept

- **Stil:** „Friendly Play“ (angelehnt an Kahoot & Duolingo)
- **Farben:** Violett (Primary) • Türkis (Secondary) • Gelb (Accent) • Hellgrau (Background)
- **Schrift:** [Poppins](https://fonts.google.com/specimen/Poppins)
- **Navigation:** Bottom-Navigation mit Lucide-Icons
- **UI:** Runde Karten, grosse Buttons, Bild-Uploads mit Vorschau

---

## 👥 Rollen & Berechtigungen

### Globale Rollen (Systemweit)

| Rolle       | Beschreibung                                     | Beispielrechte                      |
| ----------- | ------------------------------------------------ | ----------------------------------- |
| **Admin**   | Vollzugriff, Jahresabschluss, Benutzerverwaltung | `canManageUsers`, `canLockEvenings` |
| **Spieler** | Teilnahme an Abenden, Punkte & Ergebnisse sehen  | `canViewStats`, `canVote`           |
| **Gast**    | Nur Lesezugriff, kein Login nötig (optional)     | `canViewPublic`                     |

### Abend-spezifische Rollen (pro Evening)

| Lokale Rolle    | Beschreibung                                                                                               |
| --------------- | ---------------------------------------------------------------------------------------------------------- |
| **Spielleiter** | Vom Admin oder beim Anlegen des Abends zugewiesen. Darf Spiele & Punkte beim zugewiesenen Abend verwalten. |

**Beispiel:**

- User A → nur „Spieler“
- User B → „Admin“ und „Spieler“
- User C → „Spieler“, aber „Spielleiter“ bei mehreren Abenden

Die Spielleiter-Zuweisung erfolgt im jeweiligen `evenings`-Dokument über das Feld `spielleiterId`.

---

## 🛠️ Admin-Funktionen

Admins verwalten zentrale Inhalte über ein eigenes Menü im Header (Zahnrad-Icon).  
Die folgenden Seiten stehen nur für Admins zur Verfügung:

- 👥 `/admin/users` – Benutzer und Rollen verwalten
- 📅 `/admin/years` – Spieljahre erstellen & Jahresabschluss
- 📤 `/admin/export` – CSV-Export und Bilder (optional)
- 📆 `/abende` – Admins können direkt Abende erstellen und verwalten
- 🧮 `/admin/years/:year` – Alle Abende eines Jahres einsehen & Jahr abschliessen

Die Admin-Funktionen sind über ein Dropdown-Menü im Header erreichbar, nicht über ein eigenes Dashboard.

---

## 🔐 Authentifizierung & Autorisierung

- **Token-Art:** JWT (JSON Web Token)
- **Gültigkeit:** 12 Stunden, danach automatisches Logout
- **Middleware:** `checkAuth` prüft Token, `checkRole()` prüft Berechtigung
- **Erstinstallation:** Der erste registrierte Benutzer wird manuell in MongoDB zu `role: "admin"` geändert.

**Middleware-Beispiel (Express):**

```js
app.post("/api/evenings", checkAuth, checkRole("admin"), createEvening);
app.patch(
  "/api/evenings/:id/games",
  checkAuth,
  checkRole("spielleiter"),
  updateGames,
);
```

---

## 🧩 Datenbankmodelle (MongoDB)

### 🧑 `users`

```json
{
  "_id": "ObjectId",
  "username": "Max",
  "displayName": "Max Mustermann",
  "passwordHash": "hashed_pw",
  "role": "spieler",
  "createdAt": "...",
  "active": true
}
```

### 🎲 `games`

```json
{
  "_id": "ObjectId",
  "name": "Uno",
  "category": "Kartenspiel",
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
  "pollId": "poll123",
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

### 🧮 `userStats` (automatisch, pro Spieljahr)

```json
{
  "_id": "ObjectId",
  "userId": "user123",
  "spieljahr": 2025,
  "totalPoints": 187,
  "totalWins": 5,
  "eveningsAttended": 9
}
```

---

## 🧮 Punktelogik & Statistik-Regeln

### Abendwertung

- Jeder Abend kann mehrere Spiele enthalten.
- Punkte jedes Spielers werden pro Abend **aufsummiert**.
- Nach dem Schliessen des Abends werden die Gesamtsummen fixiert.

### Tagessieger

- Der Spieler mit der höchsten Punktzahl am Abend ist Tagessieger.
- Bei Gleichstand gibt es mehrere Sieger.

### Jahreswertung

- Wird erst nach Abschluss **aller Abende** eines Jahres erstellt.
- Die Gesamtpunkte aller Abende werden pro Spieler summiert.
- Der Spieler mit den meisten Punkten ist Jahressieger.
- Gleichstände sind möglich und werden gemeinsam angezeigt.
- Siege zählen nur als Statistikwert.

### Statistische Felder

| Feld               | Beschreibung                    |
| ------------------ | ------------------------------- |
| `totalPoints`      | Summe aller Punkte eines Jahres |
| `totalWins`        | Anzahl gewonnener Abende        |
| `eveningsAttended` | Anzahl besuchter Abende         |
| `rank`             | Platz im Jahresranking          |

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
- Ort wird automatisch durch den Organisator bestimmt
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
  - Spiele mit Punkten eintragen (mit Dropdown + „Neues Spiel hinzufügen“)
  - Gruppenfoto hochladen
- Abend wird manuell auf `abgeschlossen` gesetzt
- Sieger wird automatisch ermittelt (höchste Punktzahl)

---

### 5. ✅ Abschluss durch Admin

- Admin prüft und **sperrt den Abend**
- Abend wird in die **Historie** übernommen
- Jahresstatistik (`userStats`, `gameStats`) wird aktualisiert (Achtung: Gleichstand möglich)

---

### Status-Phasen

| Status          | Beschreibung                       | Verantwortlich      |
| --------------- | ---------------------------------- | ------------------- |
| `offen`         | Abend angelegt, Umfrage ausstehend | Admin / Spielleiter |
| `fixiert`       | Datum steht fest, Teilnahme läuft  | Spielleiter         |
| `abgeschlossen` | Spiele & Punkte eingetragen        | Spielleiter         |
| `gesperrt`      | Final archiviert                   | Admin               |

---

## 🖼️ Upload-Handling (Bilder)

- Bilder werden **nicht** in MongoDB gespeichert.
- Speicherung erfolgt in **Cloudinary**, nur URL in der DB.
- Maximale Dateigrösse: 2 MB (nur JPG/PNG).

| Typ         | Hochgeladen von            | Zugriff               |
| ----------- | -------------------------- | --------------------- |
| Gruppenfoto | Spielleiter                | Alle Spieler          |
| Spielbild   | Spielleiter/Admin          | Alle Spieler          |
| Profilbild  | Benutzer selbst (optional) | Nur eingeloggter User |

---

## 📦 Vorteile von Cloudinary

- 🚀 CDN-Auslieferung weltweit
- 🖼️ Automatische Optimierung & Thumbnails
- 🧰 Transformationen via URL
- 🆓 Kostenloser Plan für kleine Projekte

---

## 📊 Sicherheit & Validierung

- Nur authentifizierte Benutzer dürfen Daten ändern
- Bildvalidierung über Backend (Grösse, Typ)
- Passwörter mit **bcrypt** gehasht
- JWT wird nach 12h automatisch ungültig
- Rate-Limiting für Login-Endpunkte

---

## 📂 Lizenz & Hinweise

Private Freizeit-App, nicht für öffentliche Nutzung vorgesehen.  
© 2025 – Spielabend App | Alle Rechte beim Entwickler.
