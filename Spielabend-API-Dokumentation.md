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
| POST    | `/api/auth/refresh` | Zugriffstoken per `HttpOnly`-Sitzung erneuern |
| POST    | `/api/auth/logout`  | Aktuelle Langzeitsitzung widerrufen |
| POST    | `/api/auth/session` | Gültiges altes JWT einmalig migrieren |
| GET     | `/api/auth/me`      | Aktuellen User abrufen      |

### Beispiel

**POST /api/auth/login**

```json
{ "username": "max", "password": "secret" }
```

Beim Login setzt das Backend zusätzlich das Cookie `cavegames_refresh`. Das kurzlebige JWT wird als Bearer-Token verwendet und vom Frontend bei Ablauf automatisch erneuert. Refresh-Geheimnisse liegen in der Datenbank ausschliesslich als Hash vor und werden bei erfolgreicher Erneuerung rotiert. Auth-Antworten dürfen nicht gecacht werden.

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
| PATCH   | `/api/users/me/password` | Eigenes Passwort ändern und Sitzungen widerrufen |
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

Sobald ein Spiel am Abend erfasst wurde, ist die Teilnehmerliste für die
Selbstbedienung gesperrt. Bis zum Abschluss dürfen Spielleiter und Admins
weiterhin Teilnehmer hinzufügen; für neue Teilnehmer wird in jedem bestehenden
Spiel automatisch ein Punktestand von 0 angelegt. Sie können Teilnehmer auch
gezielt entfernen. Bei vorhandenen Spielen muss der DELETE-Request dafür
`{ "confirmScoreDeletion": true }` im JSON-Body enthalten; alle Scores des
entfernten Teilnehmers werden dann aus sämtlichen Spielen gelöscht und bereits
erzeugte Abend- und Jahresstatistiken neu berechnet.

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

## 🔔 Push-Benachrichtigungen

| Methode | Route                                       | Beschreibung                         |
| ------- | ------------------------------------------- | ------------------------------------ |
| GET     | `/api/notifications/vapid-public-key`       | Öffentlichen VAPID-Schlüssel abrufen |
| GET     | `/api/notifications/preferences`            | Eigene Kategorien abrufen             |
| PATCH   | `/api/notifications/preferences`            | Eigene Kategorien aktualisieren       |
| POST    | `/api/notifications/subscriptions`          | Browser-Abonnement speichern         |
| DELETE  | `/api/notifications/subscriptions`          | Browser-Abonnement entfernen         |

Alle Routen benötigen eine Anmeldung. Ein Benutzer kann mehrere Geräte
registrieren. Beim Erstellen einer produktiven Umfrage werden alle aktiven
Benutzer mit aktiviertem Abonnement ausser dem Ersteller benachrichtigt.
Testmodus-Umfragen versenden keine echten Push-Meldungen.

Verfügbare Kategorien sind `pollCreated`, `pollReminder`, `pollFinalized`,
`eveningChanged`, `resultsAvailable` und `eveningUpcoming`. Offene Umfragen
werden höchstens einmal pro Kalenderwoche und nur bei fehlender eigener Stimme
gemeldet. Die Termin-Erinnerung wird einmalig sieben Tage vor dem Abend
versendet.

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
