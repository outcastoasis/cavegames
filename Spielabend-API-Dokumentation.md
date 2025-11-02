# Spielabend App – API Dokumentation

## 🌐 Basis-URL

```
/api/
```

---

## 🔐 Authentifizierung

| Methode | Route               | Beschreibung                |
| ------- | ------------------- | --------------------------- |
| POST    | `/api/auth/login`   | Login mit Username/Passwort |
| POST    | `/api/auth/refresh` | Token erneuern              |
| GET     | `/api/auth/me`      | Aktuellen User abrufen      |

### Beispiel

**POST /api/auth/login**

```json
{ "username": "max", "password": "secret" }
```

**Response:**

```json
{
  "token": "jwt_token_here",
  "user": {
    "_id": "u1",
    "username": "max",
    "displayName": "Max Mustermann",
    "role": "spielleiter"
  }
}
```

---

## 👥 Benutzer (Users)

| Methode | Route            | Beschreibung                      |
| ------- | ---------------- | --------------------------------- |
| GET     | `/api/users`     | Alle Benutzer (Admin)             |
| POST    | `/api/users`     | Benutzer anlegen (Admin)          |
| GET     | `/api/users/:id` | Benutzer-Details (Admin, Self)    |
| PATCH   | `/api/users/:id` | Benutzer bearbeiten (Admin, Self) |
| DELETE  | `/api/users/:id` | Benutzer deaktivieren (Admin)     |

---

## 🎮 Spiele (Games)

| Methode | Route            | Beschreibung                             |
| ------- | ---------------- | ---------------------------------------- |
| GET     | `/api/games`     | Alle Spiele abrufen                      |
| POST    | `/api/games`     | Neues Spiel anlegen (Admin, Spielleiter) |
| GET     | `/api/games/:id` | Spiel-Detail abrufen                     |
| PATCH   | `/api/games/:id` | Spiel bearbeiten                         |
| DELETE  | `/api/games/:id` | Spiel archivieren (Admin)                |

---

## 📅 Spieleabende (Evenings)

| Methode | Route                      | Beschreibung                |
| ------- | -------------------------- | --------------------------- |
| GET     | `/api/evenings`            | Alle Abende anzeigen        |
| POST    | `/api/evenings`            | Neuen Abend anlegen (Admin) |
| GET     | `/api/evenings/:id`        | Abend-Details               |
| PATCH   | `/api/evenings/:id`        | Abend bearbeiten            |
| PATCH   | `/api/evenings/:id/status` | Status ändern               |
| DELETE  | `/api/evenings/:id`        | Abend löschen (Admin)       |

### Status-Übergänge

`offen → fixiert → abgeschlossen → gesperrt`  
Nur bestimmte Rollen dürfen Status ändern.

---

## 🙋 Teilnahme (Participants)

| Methode | Route                                    | Beschreibung            |
| ------- | ---------------------------------------- | ----------------------- |
| POST    | `/api/evenings/:id/participants`         | Teilnahme bestätigen    |
| DELETE  | `/api/evenings/:id/participants/:userId` | Teilnahme entfernen     |
| GET     | `/api/evenings/:id/participants`         | Teilnehmerliste abrufen |

---

## 📊 Umfragen (Polls)

| Methode | Route                     | Beschreibung                  |
| ------- | ------------------------- | ----------------------------- |
| POST    | `/api/polls`              | Neue Termin-Umfrage erstellen |
| GET     | `/api/polls/:id`          | Umfrage anzeigen              |
| PATCH   | `/api/polls/:id/vote`     | Stimme abgeben                |
| PATCH   | `/api/polls/:id/finalize` | Umfrage finalisieren          |
| DELETE  | `/api/polls/:id`          | Umfrage löschen               |

---

## 🎲 Spiele innerhalb eines Abends

| Methode | Route                                  | Beschreibung                    |
| ------- | -------------------------------------- | ------------------------------- |
| GET     | `/api/evenings/:id/games`              | Spieleinträge abrufen           |
| POST    | `/api/evenings/:id/games`              | Neues Spiel + Punkte hinzufügen |
| PATCH   | `/api/evenings/:id/games/:gameEntryId` | Spiel-Eintrag bearbeiten        |
| DELETE  | `/api/evenings/:id/games/:gameEntryId` | Spiel-Eintrag löschen           |

---

## 🖼️ Uploads (Bilder)

| Methode | Route                           | Beschreibung                |
| ------- | ------------------------------- | --------------------------- |
| POST    | `/api/uploads/signature`        | Cloudinary-Signatur abrufen |
| PATCH   | `/api/evenings/:id/group-photo` | Gruppenfoto-URL speichern   |
| PATCH   | `/api/games/:id/image`          | Spielbild-URL speichern     |

---

## 🗓️ Spieljahre

| Methode | Route                    | Beschreibung               |
| ------- | ------------------------ | -------------------------- |
| GET     | `/api/years`             | Liste aller Spieljahre     |
| POST    | `/api/years`             | Neues Jahr anlegen (Admin) |
| GET     | `/api/years/:year`       | Jahresdetails abrufen      |
| POST    | `/api/years/:year/close` | Jahr abschliessen (Admin)  |

---

## 🧮 Statistiken

| Methode | Route                               | Beschreibung            |
| ------- | ----------------------------------- | ----------------------- |
| GET     | `/api/stats/leaderboard?year=2025`  | Jahresrangliste abrufen |
| GET     | `/api/stats/user/:userId?year=2025` | Benutzerstatistik       |
| GET     | `/api/stats/games?year=2025`        | Spielstatistik          |

---

## 🔔 Benachrichtigungen (optional)

| Methode | Route                         | Beschreibung                        |
| ------- | ----------------------------- | ----------------------------------- |
| GET     | `/api/notifications`          | Eigene Benachrichtigungen abrufen   |
| PATCH   | `/api/notifications/:id/read` | Benachrichtigung lesen              |
| POST    | `/api/notifications/test`     | Testbenachrichtigung senden (Admin) |

---

## ⚙️ Utilities

| Methode | Route            | Beschreibung             |
| ------- | ---------------- | ------------------------ |
| GET     | `/api/health`    | API-Status prüfen        |
| GET     | `/api/config/ui` | UI-Konfiguration abrufen |
| GET     | `/api/search`    | Globale Suche            |

---

## 🚨 Fehlerformat

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "scores[1].points must be a number",
    "details": { "path": "scores[1].points", "expected": "number" }
  }
}
```

---

## 📋 HTTP Status Codes

| Code | Bedeutung            |
| ---- | -------------------- |
| 200  | OK                   |
| 201  | Created              |
| 204  | No Content           |
| 400  | Bad Request          |
| 401  | Unauthorized         |
| 403  | Forbidden            |
| 404  | Not Found            |
| 409  | Conflict             |
| 422  | Unprocessable Entity |
| 500  | Server Error         |
