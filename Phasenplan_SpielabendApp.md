# 🧩 Spielabend App – Phasenplan (Empfohlene Entwicklungsreihenfolge)

Dieser Phasenplan beschreibt den schrittweisen Aufbau der **Spielabend-App**, basierend auf dem definierten Stack (React, Node.js/Express, MongoDB, Cloudinary).  
Ziel ist eine strukturierte, nachvollziehbare Entwicklung mit stabilen Meilensteinen.

---

## ⚙️ Phase 1 – Projektgrundlage & Setup

### Backend
- Projektstruktur anlegen (`controllers/`, `models/`, `routes/`, `middleware/`)
- `server.js` Grundsetup mit Express + CORS + JSON Parser
- Verbindung zu MongoDB Atlas herstellen
- `.env`-Variablen einführen (z. B. DB_URI, JWT_SECRET, CLOUDINARY_KEYS)
- Beispielroute `/api/test` zur Verbindungskontrolle

### Frontend
- React-Projekt erstellen (z. B. via Vite)
- Grundstruktur mit `src/pages/`, `src/components/`, `src/styles/`
- `variables.css` + globale Farbpalette einbinden
- Navigation & Dummy-Seiten erstellen (Home, Login, Register)

---

## 🔐 Phase 2 – Authentifizierungssystem (JWT)

### Backend
- `User`-Modell (username, displayName, passwordHash, role)
- Auth-Routen:
  - `POST /api/auth/register`
  - `POST /api/auth/login`
  - `GET /api/auth/me` (über Middleware geschützt)
- Token-Handling mit JWT (12h Gültigkeit)
- Middleware:
  - `checkAuth` → prüft Token
  - `checkRole(role)` → prüft Rollenrechte
- Passwörter mit `bcrypt` hashen

### Frontend
- Login- & Register-Seiten erstellen
- AuthContext + Token-Speicherung (localStorage)
- Geschützte Routen per React Router
- Logout-Button implementieren

---

## 🧑‍🤝‍🧑 Phase 3 – Benutzer & Rollenverwaltung

### Backend
- CRUD-Endpunkte `/api/users`
- Nur `admin` darf Benutzer und Rollen verwalten
- Rollenlogik:
  - **admin**, **spieler**, **spielleiter**
- Optional: Admin kann Spielleiter pro Abend zuweisen

### Frontend
- Adminbereich mit Benutzerliste & Rollenauswahl
- Spielerübersicht & Rollenanzeige im Profil
- Styling im bestehenden Design

---

## 📅 Phase 4 – Abende & Spieljahr-Logik

### Backend
- `Evening`-Modell:
  - `date`, `spielleiterId`, `participantIds`, `games[]`, `status`
- CRUD-Endpunkte `/api/evenings`
- Statusverwaltung (`offen`, `fixiert`, `abgeschlossen`, `gesperrt`)
- Middleware: Nur Admin oder Spielleiter darf ändern
- Logik: Nur **ein offener Abend** pro Jahr zulässig

### Frontend
- Seite **Abende** (Liste + Status)
- Seite **Abend-Details** (Infos, Teilnehmer, Spiele)
- Erstellung neuer Abende (Admin)
- Fortschritt über Status-Icons anzeigen

---

## 📊 Phase 5 – Umfragen (Terminfindung)

### Backend
- Modell `Poll` (mit Datumsvorschlägen + Stimmen)
- Verknüpfung mit Evening (`pollId`)
- Endpunkte:
  - `POST /api/polls`
  - `PATCH /api/polls/:id/vote`
  - `PATCH /api/polls/:id/finalize`

### Frontend
- Seite **Umfragen** (Anzeige + Abstimmung)
- Abstimmung durch Spieler
- Anzeige des Ergebnisses (fixierter Termin)

---

## 🎮 Phase 6 – Spieleverwaltung & Punkteerfassung

### Backend
- Modell `Game` (Name, Kategorie, Bild, createdBy)
- `PATCH /api/evenings/:id/games` → Punkte speichern
- Automatische Punkteauswertung pro Abend
- Gewinnerberechnung & Speicherung

### Frontend
- Punkteformular pro Spieler
- Anzeige des Tagessiegers (bei Abschluss)
- Game-Dropdown + „Neues Spiel hinzufügen“

---

## 🏆 Phase 7 – Jahreswertung & Leaderboard

### Backend
- `userStats` Modell automatisch updaten
- Aggregation über alle Abende eines Jahres
- API `/api/leaderboard/:year`
- Gleichstände berücksichtigen

### Frontend
- Seite **Leaderboard** (Rangliste mit Punkten & Siegen)
- Jahresrückblick & Hall of Fame
- Dynamische Auswahl nach Jahr

---

## 🖼️ Phase 8 – Uploads & Bilder (Cloudinary)

### Backend
- Integration mit Cloudinary SDK
- Middleware für Datei-Uploads (Multer)
- Nur URL-Speicherung in MongoDB
- Typprüfung (nur JPG/PNG, max 2 MB)

### Frontend
- Upload-Komponente mit Vorschau
- Gruppenfoto & Spielbild in Evening-Details

---

## 🔔 Phase 9 – Feinschliff & Sicherheit

- Rate-Limiting für Login
- Input-Validation (Joi oder express-validator)
- Rollenprüfung in allen API-Routen
- Responsive Design finalisieren
- Light/Dark-Mode optional
- 404- & Fehlerseiten im Frontend

---

## 🚀 Phase 10 – Deployment

- **Frontend:** Vercel (Production Build)
- **Backend:** Railway oder Render
- **Datenbank:** MongoDB Atlas
- **Domain:** Optional Subdomain (z. B. spielabend.app)

---

## 🧾 Bonusideen (später optional)

- Push-Notifications für neue Umfragen
- Profilbilder & individuelle Statistiken
- Kalenderintegration (ICS-Export)
- Exportfunktion (PDF / CSV)
- Teammodus (2er-Teams pro Abend)
