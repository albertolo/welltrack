# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

WellTrack is a wellness tracking app for people with chronic health conditions. Users log symptoms, moods, medications, and habits, then view trends to identify patterns. The target is simplicity — designed for people who may have brain fog or fatigue.

## Tech Stack

- **Frontend:** React with TypeScript, Tailwind CSS (not yet implemented)
- **Backend:** Node.js + Express with TypeScript
- **Database:** PostgreSQL with Prisma ORM (planned)
- **Auth:** JWT with refresh tokens (planned)
- **Validation:** Zod

## Monorepo Structure

This is an npm workspace monorepo. Packages live in `/backend` and `/frontend`. **All packages are hoisted to the root `node_modules`** — run `npm install` from the repo root, not from individual packages.

```
/backend    Node.js/Express API
/frontend   React app (not yet scaffolded)
/Documents  Requirements.md and Tasks.md (source of truth for work)
```

## Backend Commands

All commands must be run from `backend/` unless noted otherwise.

```bash
# Development
npm run dev              # ts-node-dev with hot reload on src/index.ts

# Testing (Jest is hoisted to root; use the wrapper scripts)
npm run test             # all tests
npm run test:unit        # tests/unit/**
npm run test:integration # tests/integration/** (requires live DB)
npm run test:coverage    # with coverage report

# Single test file
cd backend && node ../node_modules/.bin/jest.cmd tests/unit/health.test.ts

# Build
npm run build            # tsc → dist/

# Lint / format
npm run lint             # eslint src/
npm run format           # prettier src/

# Database
npm run db:generate      # regenerate Prisma client after schema changes
npm run db:push          # push schema changes to DB without a migration
npm run db:seed          # run prisma/seed.ts against the live DB
```

> **Windows note:** Jest and Prisma binaries are shell scripts that must be invoked via their `.cmd` wrappers (e.g. `node ../node_modules/.bin/jest.cmd`) when calling them directly with `node`. The npm scripts handle this automatically.

## Database

PostgreSQL runs in Docker:

```bash
docker run --name welltrack-db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=welltrack \
  -p 5432:5432 -d postgres:16-alpine
```

`.env` (in `backend/`) must contain:
```
DATABASE_URL="postgresql://postgres:password@localhost:5432/welltrack"
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
PORT=3000
```

`backend/prisma/seed.ts` seeds 15 default symptoms and 10 default habits. System records use `userId: null` and IDs in the form `system-<slug>` (e.g. `system-headache`).

## Architecture

### Backend layout (planned per `Documents/Tasks.md`)

```
backend/src/
  app.ts          Express app (no server.listen — import this in tests)
  index.ts        Calls app.listen — the actual server entry point
  controllers/    Route handlers
  middleware/     Auth (JWT verify), validation, error handling
  routes/         Express router definitions
  services/       Business logic
  utils/          jwt helpers, bcrypt helpers
```

`app.ts` and `index.ts` are intentionally split so supertest can import `app` without binding a port.


### Frontend Structure
- Pages: `/frontend/src/pages/` — Route components
- Components: `/frontend/src/components/` — Reusable UI components
- Hooks: `/frontend/src/hooks/` — Custom React hooks
- Services: `/frontend/src/services/` — API client functions


### Key Patterns

- **App/Server separation:** `app.ts` exports the Express app for testing; `index.ts` handles server startup
- **Tests location:** Tests live in `src/__tests__/` using `.test.ts` suffix
- **Environment:** Uses dotenv; create `.env` file (not committed)

## API Endpoints

Base URL: `/api`

Current:
- `GET /api/health` - Health check

Planned (see [Documents/Requirements.md](Documents/Requirements.md)):
- Auth: `/api/auth/*`
- Users: `/api/users/*`
- Symptoms/Logs: `/api/symptoms/*`, `/api/symptom-logs/*`
- Moods: `/api/mood-logs/*`
- Medications: `/api/medications/*`, `/api/medication-logs/*`
- Habits: `/api/habits/*`, `/api/habit-logs/*`
- Insights: `/api/insights/*`, `/api/export/*`


### Key data model rules

- `user_id = null` on `Symptom` and `Habit` → system default, visible to all users, cannot be deleted by users
- All user-owned data cascades delete when a `User` is deleted
- Log tables (`symptom_logs`, `mood_logs`, `medication_logs`, `habit_logs`) all have a composite index on `(user_id, logged_at)` for range queries
- Severity on `SymptomLog` is 1–10; mood/energy/stress scores are 1–5
- `HabitLog` stores values in three nullable columns: `value_boolean`, `value_numeric`, `value_duration` — only the one matching the habit's `TrackingType` should be set

### Auth design (to be implemented)

- Short-lived access tokens (15 min) + long-lived refresh tokens (7 days)
- Refresh tokens stored in DB or blocklist-based logout
- All protected routes require `Authorization: Bearer <access_token>`

### Testing conventions

- Unit tests live in `tests/unit/` — no real DB, pure logic and supertest against the Express app
- Integration tests live in `tests/integration/` — hit the live PostgreSQL container
- `tests/setup.ts` loads `.env` via dotenv before every suite
- `tsconfig.test.json` extends the main tsconfig and adds `"types": ["jest", "node"]` — used by ts-jest


## Git Workflow
When completing tasks from TASKS.md:
1. Create a new branch named `feature/<task-number>-<brief-description>` before starting work
2. Make atomic commits with conventional commit messages:
   - feat: for new features
   - fix: for bug fixes
   - docs: for documentation
   - test: for tests
   - refactor: for refactoring
3. After completing a task, create a pull request with:
   - A descriptive title matching the task
   - A summary of changes made
   - Any testing notes or considerations
4. Update the task checkbox in TASKS.md to mark it complete


## Testing Requirements
Before marking any task as complete:
1. Write unit tests for new functionality
2. Run the full test suite with: `npm test`
3. If tests fail:
 - Analyze the failure output
 - Fix the code (no the tests, unless tests are incorrect)
 - Re-run tests until all pass
4. For API endpoints, include integration tests that verify:
 - Success responses with valid input
 - Authentication requirements
 - Edge cases
## Test Commands
- Backend tests: `cd backend && npm test`
- Frontend tests: `cd frontend && npm test`
- Run specific test file: `npm test -- path/to/test.ts`
- Run test matching pattern: `npm test -- --grep "pattern"`