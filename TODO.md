# MindClash Backend TODO

## Context: why this TODO exists
- Primary product goal: host a realtime 1v1 duel experience where multiple users can play simultaneously.
- Current state: backend core logic is mostly in place, but frontend gameplay wiring is still incomplete.
- This file tracks both:
  - hardening items needed for production safety.
  - the shortest path to a first playable realtime slice.

## Context: how to execute this plan
- Work in vertical slices (backend query + frontend usage + manual test) instead of isolated partial edits.
- Keep backend as source of truth for game state, fairness, and timing; frontend should only render and trigger actions.
- After each major step, validate with 2-browser manual tests (two different accounts).
- Definition of done for each task:
  - endpoint/UI path works,
  - failure states are user-visible,
  - no schema/contract drift,
  - build passes.

## Hardening items shipped

### 1) Team-mode scoring policy - DONE
- Chose Option A: at most one point per team per question (first correct
  only).
- Pure policy lives in `convex/gameplayScoring.ts` and is consumed by
  `finalizeMatch` in `convex/gameplay.ts`.
- Unit tests in `convex/__tests__/gameplayScoring.test.ts` cover duel,
  team duplicates, ties, and non-participants. Run with `npm test`.

### 2) Role/admin protection for question management - DONE
- Added optional `role` field on `users` (`admin` | `user`) plus
  `by_role` index in `convex/schema.ts`.
- New `convex/auth.ts` exposes `requireAdmin`, `resolveCurrentUser`,
  `hasAnyAdmin` and stable `code:` prefixed errors.
- `createQuestion` and `assignQuestionsToMatch` in `convex/questions.ts`
  now call `requireAdmin` before doing any work.
- Bootstrap path: set `ADMIN_CLERK_IDS` env var in Convex OR call
  `users.claimFirstAdmin` once; further promotions go through
  `users.setUserRole` (admin-only).
- Frontend can read `users.getMyRole` to hide admin UI.

### 3) Frontend contract documentation - DONE
- See `docs/API_CONTRACT.md` for the 5 scenarios (happy path, timeout
  advance, duplicate submit, unauthorized submit, tie finish) plus the
  error-code convention the UI should branch on.
- Live end-to-end verification of those 5 scenarios is still tracked
  under "First playable realtime slice" below - the contract doc is
  the expected-payload reference.

## First playable realtime slice (2-browser duel)

### Completed so far
- Backend read/query endpoints wired and used by arena:
  - `getMatchState`
  - `getCurrentQuestionForMatch`
  - `getMyAnswerForCurrentQuestion`
  - `getAnswersCountForCurrentQuestion`
- Arena uses real Convex subscriptions/mutations for match state and gameplay actions.
- Matchmaking flow now goes through `/matchmaking` and performs server-side `findOrCreateDuelMatch` to reduce create/join races.
- Timer UI and finish screen are implemented in `src/app/arena/page.tsx`.
- Landing page is restored to `/` and queue selection UX is now step-based (grade -> faculty -> topic).

### Remaining for this slice
- Run and document a clean 2-browser pass where both users consistently:
  1. Enter same queue.
  2. Land on same `matchId`.
  3. Submit answers.
  4. Progress through all questions.
  5. Reach final result without auth/session errors.
- Stabilize Clerk/Convex auth handshake so mutations (`submitAnswer`, `advanceQuestion`) do not intermittently return unauthorized.
- Resolve remaining race/UX edge cases:
  - stale waiting matches from old sessions
  - non-owner/client lag around auto-advance
  - clear "waiting for opponent answer" and "syncing auth" states
- Expand seeded question sets per queue so matches have enough rounds for realistic testing.

### Important gotchas
- Why:
  - These are the common integration mistakes likely to waste time during implementation.
- How:
  - Validate each gotcha explicitly while wiring and during 2-browser tests.
- `submitAnswer` expects `matchQuestionId` (not `questionId`).
- `advanceQuestion` can race when another client has already advanced/finished; UI should treat this as state-sync, not a hard failure.
- Arena is currently static mock; implement this as one full vertical slice, not partial wiring.
