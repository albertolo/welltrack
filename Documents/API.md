# WellTrack API Reference

Base URL: `http://localhost:3000/api`

All protected endpoints require an `Authorization: Bearer <access_token>` header.

## Table of Contents

- [Health](#health)
- [Auth](#auth)
- [Users](#users)
- [Symptoms](#symptoms)
- [Symptom Logs](#symptom-logs)
- [Mood Logs](#mood-logs)
- [Medications](#medications)
- [Medication Logs](#medication-logs)
- [Habits](#habits)
- [Habit Logs](#habit-logs)

---

## Health

### GET /api/health

Returns server status.

**Response 200**
```json
{ "status": "ok", "timestamp": "2024-01-15T10:00:00.000Z" }
```

---

## Auth

### POST /api/auth/register

Create a new account.

**Request body**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "displayName": "Jane Doe"
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `email` | string | yes | Must be a valid email |
| `password` | string | yes | Min 8 characters |
| `displayName` | string | no | |

**Response 201**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "displayName": "Jane Doe",
    "timezone": "UTC",
    "createdAt": "2024-01-15T10:00:00.000Z"
  },
  "accessToken": "<jwt>",
  "refreshToken": "<jwt>"
}
```

**Errors**
- `400` – Validation error
- `409` – Email already registered

---

### POST /api/auth/login

Sign in with email and password.

**Request body**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response 200**
```json
{
  "user": { "id": "uuid", "email": "user@example.com", "displayName": "Jane Doe" },
  "accessToken": "<jwt>",
  "refreshToken": "<jwt>"
}
```

**Errors**
- `400` – Validation error
- `401` – Invalid credentials

---

### POST /api/auth/refresh

Exchange a valid refresh token for a new access token. The old refresh token is invalidated.

**Request body**
```json
{ "refreshToken": "<jwt>" }
```

**Response 200**
```json
{
  "accessToken": "<jwt>",
  "refreshToken": "<jwt>"
}
```

**Errors**
- `401` – Invalid or expired refresh token

---

### POST /api/auth/logout

Invalidate the current refresh token.

**Request body**
```json
{ "refreshToken": "<jwt>" }
```

**Response 204** _(no body)_

---

### POST /api/auth/forgot-password

Request a password reset. The reset link is logged to the server console (email delivery is a future feature).

**Request body**
```json
{ "email": "user@example.com" }
```

**Response 200**
```json
{ "message": "If that email exists, a reset link has been sent." }
```

---

### POST /api/auth/reset-password

Set a new password using the reset token from the forgot-password flow.

**Request body**
```json
{
  "token": "<reset-token>",
  "password": "newpassword"
}
```

**Response 200**
```json
{ "message": "Password updated successfully." }
```

**Errors**
- `400` – Token invalid, expired, or already used

---

## Users

### GET /api/users/me

Return the authenticated user's profile.

**Auth required**

**Response 200**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "displayName": "Jane Doe",
    "timezone": "America/New_York",
    "createdAt": "2024-01-15T10:00:00.000Z"
  }
}
```

---

### PATCH /api/users/me

Update display name and/or timezone.

**Auth required**

**Request body** _(all fields optional)_
```json
{
  "displayName": "Jane D.",
  "timezone": "America/Chicago"
}
```

**Response 200**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "displayName": "Jane D.",
    "timezone": "America/Chicago",
    "createdAt": "2024-01-15T10:00:00.000Z"
  }
}
```

**Errors**
- `400` – No fields provided

---

### DELETE /api/users/me

Permanently delete the account and all associated data. Requires password confirmation.

**Auth required**

**Request body**
```json
{ "password": "currentpassword" }
```

**Response 204** _(no body)_

**Errors**
- `401` – Wrong password

---

## Symptoms

### GET /api/symptoms

Return all active symptoms visible to the user: system defaults (userId = null) plus the user's own custom symptoms.

**Auth required**

**Response 200**
```json
{
  "symptoms": [
    {
      "id": "system-headache",
      "name": "Headache",
      "category": "Neurological",
      "isActive": true,
      "userId": null
    },
    {
      "id": "uuid",
      "name": "Custom Symptom",
      "category": "Other",
      "isActive": true,
      "userId": "uuid"
    }
  ]
}
```

---

### POST /api/symptoms

Create a custom symptom for the authenticated user.

**Auth required**

**Request body**
```json
{
  "name": "Brain Fog",
  "category": "Neurological"
}
```

| Field | Type | Required |
|---|---|---|
| `name` | string | yes |
| `category` | string | no |

**Response 201**
```json
{
  "symptom": {
    "id": "uuid",
    "name": "Brain Fog",
    "category": "Neurological",
    "isActive": true,
    "userId": "uuid"
  }
}
```

---

### PATCH /api/symptoms/:id

Update a custom symptom.

**Auth required**

**Request body** _(all fields optional)_
```json
{
  "name": "Updated Name",
  "category": "New Category",
  "isActive": false
}
```

**Response 200**
```json
{ "symptom": { ... } }
```

**Errors**
- `403` – Cannot modify system symptoms
- `404` – Symptom not found or belongs to another user

---

### DELETE /api/symptoms/:id

Delete a custom symptom.

**Auth required**

**Response 204** _(no body)_

**Errors**
- `403` – Cannot delete system symptoms
- `404` – Symptom not found or belongs to another user

---

## Symptom Logs

### GET /api/symptom-logs

Return the authenticated user's symptom logs with optional date filtering and pagination.

**Auth required**

**Query parameters**

| Parameter | Type | Notes |
|---|---|---|
| `startDate` | ISO 8601 date | Filter logs on or after this date |
| `endDate` | ISO 8601 date | Filter logs on or before this date |
| `page` | integer | Page number (default: 1) |
| `limit` | integer | Results per page (default: 20) |

**Response 200**
```json
{
  "logs": [
    {
      "id": "uuid",
      "symptomId": "system-headache",
      "severity": 7,
      "notes": "after lunch",
      "loggedAt": "2024-01-15T14:00:00.000Z",
      "symptom": { "id": "system-headache", "name": "Headache", "category": "Neurological" }
    }
  ],
  "total": 42,
  "page": 1,
  "limit": 20
}
```

---

### POST /api/symptom-logs

Log a symptom occurrence.

**Auth required**

**Request body**
```json
{
  "symptomId": "system-headache",
  "severity": 7,
  "notes": "after lunch",
  "loggedAt": "2024-01-15T14:00:00.000Z"
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `symptomId` | string | yes | |
| `severity` | integer | yes | 1–10 |
| `notes` | string | no | |
| `loggedAt` | ISO 8601 datetime | no | Defaults to now |

**Response 201**
```json
{ "log": { ... } }
```

---

### PATCH /api/symptom-logs/:id

Update an existing symptom log.

**Auth required**

**Request body** _(all fields optional)_
```json
{
  "severity": 4,
  "notes": "much better now",
  "loggedAt": "2024-01-15T15:00:00.000Z"
}
```

**Response 200**
```json
{ "log": { ... } }
```

**Errors**
- `404` – Log not found or belongs to another user

---

### DELETE /api/symptom-logs/:id

Delete a symptom log.

**Auth required**

**Response 204** _(no body)_

**Errors**
- `404` – Log not found or belongs to another user

---

## Mood Logs

### GET /api/mood-logs

Return the authenticated user's mood logs with optional date filtering.

**Auth required**

**Query parameters**

| Parameter | Type | Notes |
|---|---|---|
| `startDate` | ISO 8601 date | |
| `endDate` | ISO 8601 date | |

**Response 200**
```json
{
  "logs": [
    {
      "id": "uuid",
      "moodScore": 4,
      "energyLevel": 3,
      "stressLevel": 2,
      "notes": "good day",
      "loggedAt": "2024-01-15T09:00:00.000Z"
    }
  ]
}
```

---

### POST /api/mood-logs

Log a mood entry.

**Auth required**

**Request body**
```json
{
  "moodScore": 4,
  "energyLevel": 3,
  "stressLevel": 2,
  "notes": "good day",
  "loggedAt": "2024-01-15T09:00:00.000Z"
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `moodScore` | integer | yes | 1–5 |
| `energyLevel` | integer | no | 1–5 |
| `stressLevel` | integer | no | 1–5 |
| `notes` | string | no | |
| `loggedAt` | ISO 8601 datetime | no | Defaults to now |

**Response 201**
```json
{ "log": { ... } }
```

---

### PATCH /api/mood-logs/:id

Update an existing mood log.

**Auth required**

**Request body** _(all fields optional)_
```json
{ "moodScore": 3, "notes": "actually a bit tired" }
```

**Response 200**
```json
{ "log": { ... } }
```

---

### DELETE /api/mood-logs/:id

Delete a mood log.

**Auth required**

**Response 204** _(no body)_

---

## Medications

### GET /api/medications

Return the authenticated user's medications.

**Auth required**

**Response 200**
```json
{
  "medications": [
    {
      "id": "uuid",
      "name": "Ibuprofen",
      "dosage": "400mg",
      "frequency": "as needed",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### POST /api/medications

Add a medication.

**Auth required**

**Request body**
```json
{
  "name": "Ibuprofen",
  "dosage": "400mg",
  "frequency": "as needed"
}
```

| Field | Type | Required |
|---|---|---|
| `name` | string | yes |
| `dosage` | string | no |
| `frequency` | string | no |

**Response 201**
```json
{ "medication": { ... } }
```

---

### PATCH /api/medications/:id

Update a medication.

**Auth required**

**Request body** _(all fields optional)_
```json
{
  "name": "Ibuprofen 400",
  "dosage": "400mg",
  "frequency": "twice daily",
  "isActive": false
}
```

**Response 200**
```json
{ "medication": { ... } }
```

---

### DELETE /api/medications/:id

Delete a medication.

**Auth required**

**Response 204** _(no body)_

---

## Medication Logs

### GET /api/medication-logs

Return the authenticated user's medication logs with optional date filtering.

**Auth required**

**Query parameters**

| Parameter | Type | Notes |
|---|---|---|
| `startDate` | ISO 8601 date | |
| `endDate` | ISO 8601 date | |

**Response 200**
```json
{
  "logs": [
    {
      "id": "uuid",
      "medicationId": "uuid",
      "taken": true,
      "takenAt": null,
      "notes": "with food",
      "createdAt": "2024-01-15T08:00:00.000Z",
      "medication": { "id": "uuid", "name": "Ibuprofen" }
    }
  ]
}
```

---

### POST /api/medication-logs

Log a medication dose.

**Auth required**

**Request body**
```json
{
  "medicationId": "uuid",
  "taken": true,
  "takenAt": "2024-01-15T08:00:00.000Z",
  "notes": "with food"
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `medicationId` | string | yes | Must belong to the authenticated user |
| `taken` | boolean | yes | |
| `takenAt` | ISO 8601 datetime | no | |
| `notes` | string | no | |

**Response 201**
```json
{ "log": { ... } }
```

**Errors**
- `404` – Medication not found or belongs to another user

---

### PATCH /api/medication-logs/:id

Update a medication log.

**Auth required**

**Request body** _(all fields optional)_
```json
{ "taken": false, "notes": "forgot" }
```

**Response 200**
```json
{ "log": { ... } }
```

---

### DELETE /api/medication-logs/:id

Delete a medication log.

**Auth required**

**Response 204** _(no body)_

---

## Habits

### GET /api/habits

Return system default habits plus the user's custom habits.

**Auth required**

**Response 200**
```json
{
  "habits": [
    {
      "id": "system-sleep",
      "name": "Sleep Duration",
      "trackingType": "DURATION",
      "unit": "hours",
      "isActive": true,
      "userId": null
    },
    {
      "id": "uuid",
      "name": "Journaling",
      "trackingType": "BOOLEAN",
      "unit": null,
      "isActive": true,
      "userId": "uuid"
    }
  ]
}
```

---

### POST /api/habits

Create a custom habit.

**Auth required**

**Request body**
```json
{
  "name": "Journaling",
  "trackingType": "BOOLEAN",
  "unit": null
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string | yes | |
| `trackingType` | enum | yes | `BOOLEAN`, `NUMERIC`, or `DURATION` |
| `unit` | string | no | e.g. `"glasses"`, `"minutes"` |

**Response 201**
```json
{ "habit": { ... } }
```

---

### PATCH /api/habits/:id

Update a custom habit.

**Auth required**

**Request body** _(all fields optional)_
```json
{
  "name": "Daily Journaling",
  "isActive": false
}
```

**Response 200**
```json
{ "habit": { ... } }
```

**Errors**
- `403` – Cannot modify system habits
- `404` – Habit not found or belongs to another user

---

### DELETE /api/habits/:id

Delete a custom habit.

**Auth required**

**Response 204** _(no body)_

**Errors**
- `403` – Cannot delete system habits
- `404` – Habit not found or belongs to another user

---

## Habit Logs

### GET /api/habit-logs

Return the authenticated user's habit logs with optional date filtering.

**Auth required**

**Query parameters**

| Parameter | Type | Notes |
|---|---|---|
| `startDate` | ISO 8601 date | |
| `endDate` | ISO 8601 date | |

**Response 200**
```json
{
  "logs": [
    {
      "id": "uuid",
      "habitId": "system-sleep",
      "valueBoolean": null,
      "valueNumeric": null,
      "valueDuration": 480,
      "notes": null,
      "loggedAt": "2024-01-15T07:00:00.000Z",
      "habit": { "id": "system-sleep", "name": "Sleep Duration", "trackingType": "DURATION" }
    }
  ]
}
```

---

### POST /api/habit-logs

Log a habit. Supply the value field that matches the habit's `trackingType`.

**Auth required**

**Request body**

| Field | Type | Required for | Notes |
|---|---|---|---|
| `habitId` | string | all | |
| `valueBoolean` | boolean | `BOOLEAN` habits | |
| `valueNumeric` | number | `NUMERIC` habits | |
| `valueDuration` | integer | `DURATION` habits | In minutes |
| `notes` | string | — | |
| `loggedAt` | ISO 8601 datetime | — | Defaults to now |

**Example (BOOLEAN)**
```json
{ "habitId": "system-exercise", "valueBoolean": true }
```

**Example (NUMERIC)**
```json
{ "habitId": "uuid", "valueNumeric": 8 }
```

**Example (DURATION)**
```json
{ "habitId": "system-sleep", "valueDuration": 480 }
```

**Response 201**
```json
{ "log": { ... } }
```

**Errors**
- `400` – Missing or wrong value field for the habit's tracking type
- `404` – Habit not found or not accessible to user

---

### PATCH /api/habit-logs/:id

Update a habit log.

**Auth required**

**Request body** _(all fields optional)_
```json
{ "valueNumeric": 10, "notes": "extra hydrated today" }
```

**Response 200**
```json
{ "log": { ... } }
```

**Errors**
- `400` – No fields provided
- `404` – Log not found or belongs to another user

---

### DELETE /api/habit-logs/:id

Delete a habit log.

**Auth required**

**Response 204** _(no body)_

**Errors**
- `404` – Log not found or belongs to another user
