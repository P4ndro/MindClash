# MindClash

MindClash is a real-time competitive learning platform where two players enter the same arena, answer the same questions, and race on both speed and accuracy.

The project is built around one core idea: turn academic practice into a live duel experience that feels like esports while remaining fair, transparent, and skill-driven.

## The Story

Most study tools are solo, static, and low-pressure. MindClash flips that model:

- You do not just solve a question, you solve it under time pressure.
- You do not compete against a score history, you compete against a live opponent.
- You do not wait for batch updates, the arena updates in real time for both players.

This repository contains the full stack for that experience: authentication, matchmaking, realtime game state, and duel resolution.

## How a Duel Works

1. A player creates or joins a duel match.
2. Both players receive the same current question.
3. Each player submits one answer for that question.
4. The game advances to the next question when rules allow.
5. Final scores determine the winner (or tie), and match results are shown.

## Architecture at a Glance

### Frontend (`src/`)
- **Framework:** Next.js (App Router) + React
- **UI role:** Render arena state, trigger gameplay actions, handle loading/errors
- **Auth UX:** Clerk sign-in/sign-up flow

### Backend (`convex/`)
- **Runtime:** Convex functions and realtime database
- **Data model:** Match, question, answer, and user records in `convex/schema.ts`
- **Game logic:** Match lifecycle and scoring in `convex/gameplay.ts`, `convex/matches.ts`, and `convex/questions.ts`
- **Realtime:** Clients subscribe to Convex queries for live updates

### Identity and Access
- **Authentication:** Clerk
- **Session-aware actions:** Convex functions validate authenticated users before protected mutations

## Tech Stack

- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS 4
- Clerk
- Convex

## Current Product Status

MindClash already has core backend gameplay logic and a polished landing flow. The next milestone is the first complete realtime duel vertical slice (two browsers, two users, full match loop) with stronger production hardening for authorization and edge cases.

See `TODO.md` for detailed execution steps and test scenarios.

## Local Development

### 1) Install dependencies

```bash
npm install
```

### 2) Create your environment file

```bash
copy .env.example .env.local
```

### 3) Configure required environment variables

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_FRONTEND_API_URL=https://your-instance.clerk.accounts.dev
CONVEX_DEPLOYMENT=
NEXT_PUBLIC_CONVEX_URL=
```

### 4) Start backend and frontend

Run these in separate terminals:

```bash
npx convex dev
```

```bash
npm run dev
```

App runs at `http://localhost:3000`.

## Project Structure

- `src/app` - Next.js routes and page entry points
- `src/components` - shared React components/providers
- `convex` - schema and server-side functions (queries/mutations/actions)
- `TODO.md` - implementation plan and hardening checklist

## Security Notes

- Do not commit real secrets; keep them in `.env.local` only.
- If any secret is exposed, rotate it immediately in Clerk/Convex dashboards.
- Treat Convex mutations as the source of truth for validation and fairness checks; do not trust client-only enforcement.
