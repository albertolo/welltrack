# WellTrack

A wellness tracking app for people with chronic health conditions. Users log symptoms, moods, medications, and habits, then view trends to identify patterns. Designed for simplicity — built with people who may experience brain fog or fatigue in mind.

## Tech Stack

- **Backend:** Node.js + Express with TypeScript
- **Database:** PostgreSQL with Prisma ORM
- **Auth:** JWT access tokens (15 min) + refresh tokens (7 days)
- **Validation:** Zod
- **Frontend:** React + TypeScript + Tailwind CSS _(in progress)_

## Project Structure

```
/backend    Node.js/Express API
/frontend   React app (in progress)
/Documents  Requirements and Tasks
/docs       API documentation
```

## Getting Started

### Prerequisites

- Node.js 18+
- Docker (for PostgreSQL)

### 1. Start the database

```bash
docker run --name welltrack-db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=welltrack \
  -p 5432:5432 -d postgres:16-alpine
```

### 2. Install dependencies

```bash
# Run from the repo root — packages are hoisted via npm workspaces
npm install
```

### 3. Configure environment

```bash
cp backend/.env.example backend/.env
# Edit backend/.env and set strong JWT secrets for production
```

### 4. Set up the database

```bash
cd backend
npm run db:push    # apply schema to the database
npm run db:seed    # seed default symptoms and habits
```

### 5. Start the dev server

```bash
cd backend
npm run dev        # hot-reload server on http://localhost:3000
```

Health check: `GET http://localhost:3000/api/health`

## Running Tests

```bash
# All tests
cd backend && npm test

# Unit tests only (no database required)
cd backend && npm run test:unit

# Integration tests (requires running PostgreSQL)
cd backend && npm run test:integration

# Coverage report
cd backend && npm run test:coverage
```

## Available Scripts (backend)

| Command | Description |
|---|---|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run test` | Run all tests |
| `npm run test:unit` | Unit tests only |
| `npm run test:integration` | Integration tests (live DB) |
| `npm run lint` | Run ESLint |
| `npm run format` | Run Prettier |
| `npm run db:generate` | Regenerate Prisma client |
| `npm run db:push` | Push schema changes to DB |
| `npm run db:seed` | Seed default data |

## API Documentation

See [Documents/API.md](Documents/API.md) for full endpoint reference.
