# MindClash

MindClash is a real-time 1v1 math battle game where two players compete by solving the same math questions as fast and accurately as possible.

This repository is organized as a monorepo with separate backend and frontend applications.

## Tech Stack

- Backend: `Node.js`, `Express`, `TypeScript`
- Database: `Neon` (PostgreSQL)
- Authentication: `Clerk` (JWT-based)
- Frontend: `React` (Vite, JavaScript)
- Realtime (planned): WebSockets (`Socket.IO` or `ws`)

## Project Structure

```text
MindClash/
  backend/    # Express + TS API, Neon integration, Clerk auth middleware
  frontend/   # React web client (Vite)
```

## Core Architecture

### Authentication (Clerk-first)

1. User signs in on frontend using Clerk.
2. Frontend gets a Clerk JWT.
3. Frontend calls backend with:
   - `Authorization: Bearer <token>`
4. Backend verifies Clerk JWT and extracts `clerk_id` (`sub` claim).
5. Backend syncs user into internal DB (`users` table) via `/api/users/sync`.

Important:
- MindClash does **not** store passwords.
- MindClash does **not** manage sessions manually.
- Clerk is the source of truth for identity.

### Database (SQL-first with Neon)

- Database schema is managed in Neon branches.
- Backend code must follow DB schema exactly.
- Schema changes should be tested in branch and merged before backend relies on them.

## Current Backend Status

Implemented:
- TypeScript backend foundation
- Environment validation
- Neon connection pool and startup DB check
- Clerk middleware and protected route middleware
- API route wiring and global error handler
- User endpoints:
  - `POST /api/users/sync`
  - `GET /api/users/me`

In progress:
- Battle, matchmaking, and answers modules
- Realtime gameplay channel flow

## Quick Start

## 1) Backend

```bash
cd backend
npm install
npm run dev
```

Backend runs on `http://localhost:4000` by default.

## 2) Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on Vite default port (usually `http://localhost:5173`).

## Environment Variables

## Backend (`backend/.env`)

```env
PORT=4000
NODE_ENV=development
DATABASE_URL=<neon_connection_string>
CLERK_SECRET_KEY=...
CLERK_PUBLISHABLE_KEY=...
CLERK_JWT_ISSUER=https://<your-clerk-domain>
```

## Frontend (`frontend/.env`)

```env
VITE_CLERK_PUBLISHABLE_KEY=...
VITE_API_BASE_URL=http://localhost:4000
```

## API Endpoints (Current)

- `GET /api/health` - health check
- `POST /api/users/sync` - create/fetch current user by Clerk identity
- `GET /api/users/me` - get current authenticated user

All protected routes require:
- `Authorization: Bearer <Clerk JWT>`

## Development Workflow

1. Keep DB schema updates in Neon branches.
2. Update backend queries/services to match merged schema.
3. Validate auth flow first (`/sync`, `/me`) before adding game logic.
4. Add battle/matchmaking/answer flows.
5. Add realtime events after REST gameplay flow is stable.

## Security Notes

- Never commit `.env` files.
- Rotate credentials immediately if any secret is exposed.
- Keep build artifacts (`dist`) and local generated files out of version control.

## Roadmap

- Complete battle lifecycle endpoints
- Implement answer validation + scoring
- Matchmaking queue and pairing
- Realtime score updates and room events
- Leaderboard and match history

