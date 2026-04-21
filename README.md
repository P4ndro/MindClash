# MindClash

MindClash is a real-time competitive learning platform. Two players enter the same queue, receive the same questions, answer under time pressure, and resolve a match live.

The product objective is straightforward: make academic practice competitive, measurable, and fair without sacrificing reliability of multiplayer state.

## What This Project Is

MindClash is a full-stack realtime application with:

- a public landing experience and authenticated dashboard flow,
- queue-based duel matchmaking by `topic`, `grade`, and `faculty`,
- server-authoritative gameplay and scoring,
- live arena state synchronization across two clients.

The platform is designed so that the backend is always the source of truth for participant validation, answer acceptance, question progression, and final results.

## Strategic Direction

Most learning products are asynchronous and solo. MindClash deliberately takes the opposite position:

- synchronous competition instead of isolated practice,
- deterministic rules instead of ambiguous grading,
- live state replication instead of delayed updates.

This is not a question bank website. It is a realtime duel system built for repeatable head-to-head sessions.

## Current Implementation Status

The project has completed core hardening milestones and is now in slice stabilization.

### Completed

- **Realtime duel foundations**
  - Live match state queries and gameplay mutations are wired end-to-end.
  - Arena and matchmaking routes are integrated with Convex subscriptions.
- **Queue specialization**
  - Matchmaking supports queue dimensions: `topic`, `grade`, `faculty`.
  - Server-side `findOrCreateDuelMatch` reduces create/join race conditions.
- **Scoring policy hardening**
  - Team scoring policy has been formalized and implemented deterministically.
  - A pure scoring module is covered by automated tests.
- **Authorization hardening**
  - Role-aware question management is enforced server-side.
  - Admin-only operations are gated with explicit authorization errors.
- **Contract documentation**
  - Expected success/error payload behavior for critical gameplay scenarios is documented in `docs/API_CONTRACT.md`.

### In Progress (Current Milestone)

The current milestone is the first fully verified realtime duel slice:

1. two users join the same queue,
2. both resolve to the same `matchId`,
3. both submit answers,
4. match progresses through all rounds,
5. final result is reached without auth/session regressions.

Open work is tracked in `TODO.md`.

## What Comes Next

Immediate priorities:

- run and document clean 2-browser certification passes,
- eliminate intermittent Clerk/Convex handshake failures for protected mutations,
- finalize race-condition UX handling (waiting states, auto-advance sync behavior),
- expand seeded question coverage for realistic queue depth.

Near-term expansion after slice stabilization:

- AI-assisted question generation tooling for admins,
- confidence-based free-text answer evaluation with deterministic fallback,
- richer ranking and progression systems on top of the duel core.

## Final Product Goals

MindClash aims to become a robust competitive learning system with:

- reliable realtime duels at scale,
- defensible fairness and scoring rules,
- structured curriculum coverage across levels and faculties,
- clear progression through ratings, history, and performance analytics,
- extensibility into tournaments and advanced multiplayer formats.

In practical terms: stable multiplayer first, then intelligence and product depth.

## Architecture Overview

### Frontend

- `Next.js` App Router with `React` and `TypeScript`
- Route-level experiences for landing, dashboard, matchmaking, and arena
- Client rendering driven by live Convex query subscriptions

### Backend

- `Convex` schema, queries, and mutations for all gameplay-critical state
- Core logic in:
  - `convex/matches.ts`
  - `convex/gameplay.ts`
  - `convex/questions.ts`
  - `convex/users.ts`

### Authentication and Access

- `Clerk` for identity
- Role-aware server-side authorization for privileged question operations
- Explicit error contracts for frontend-safe handling

## Tech Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- Convex
- Clerk
- Vitest

## Local Development

For teammate onboarding from GitHub, use the step-by-step guide:
- `docs/INSTALLATION.md`

### 1) Install dependencies

```bash
npm install
```

### 2) Configure environment

Create `.env.local` and define:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_FRONTEND_API_URL=
CONVEX_DEPLOYMENT=
NEXT_PUBLIC_CONVEX_URL=
```

Optional for admin bootstrap:

```env
ADMIN_CLERK_IDS=
```

### 3) Start services

Run in separate terminals:

```bash
npx convex dev
```

```bash
npm run dev
```

Application default: `http://localhost:3000`.

### 4) Run tests

```bash
npm test
```

## Repository Map

- `src/app` - route entry points and page-level UI
- `src/components` - shared UI and client helpers
- `convex` - schema and backend functions
- `docs/API_CONTRACT.md` - gameplay API behavior specification
- `TODO.md` - active roadmap and verification checklist

## Security and Quality Notes

- Keep secrets in `.env.local` only; never commit credentials.
- Treat backend mutations as the authoritative guardrail for integrity.
- Prefer explicit, documented error contracts over implicit client assumptions.
- Validate every major gameplay change with 2-browser realtime tests.
