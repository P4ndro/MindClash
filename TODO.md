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

## Deferred from latest gameplay hardening

### 1) Team-mode scoring policy (clarify and enforce)
- Why:
  - Team scoring ambiguity causes inconsistent rankings and potential fairness disputes.
- How:
  - Choose one scoring policy and encode it in `convex/gameplay.ts` with explicit branch logic.
  - Add targeted tests for duplicate correct answers from same team.
- Decide scoring rule for team questions:
  - Option A: at most one point per team per question (first correct only).
  - Option B: multiple members can score on the same question.
- Update `convex/gameplay.ts` score computation to match chosen policy.
- Add tests for duplicates from same team on one question.

### 2) Role/admin protection for question management
- Why:
  - Without role checks, any authenticated user could create/assign questions and corrupt match quality.
- How:
  - Add role mapping (claims or user role field), then gate mutations server-side in `convex/questions.ts`.
  - Return clear authorization errors so frontend can show actionable feedback.
- Restrict `createQuestion` and `assignQuestionsToMatch` in `convex/questions.ts`.
- Add role field/claims mapping strategy (e.g., admin/interviewer) and enforce server-side checks.
- Return clear authorization errors for unauthorized callers.

### 3) Frontend contract and integration test pass
- Why:
  - These are the critical failure modes that break live matches and user trust.
- How:
  - Run each scenario end-to-end, capture expected success/error payloads, and keep UI behavior aligned.
- Validate these 5 end-to-end scenarios:
  1. Happy path: create -> join -> assign -> submit -> advance -> finish.
  2. Timeout advance: one side does not answer, timer expires, advance succeeds.
  3. Duplicate submit: second submission for same user/question is rejected.
  4. Unauthorized submit: non-participant cannot submit.
  5. Tie finish: equal score finalizes with no duel winner.
- Document expected API responses and error messages used by UI.

## First playable realtime slice (2-browser duel)

### Goal
- Why:
  - This is the minimum proof that users can actually play in realtime on hosted infrastructure.
- How:
  - Complete one full duel loop using real Convex subscriptions and mutations before adding polish/more modes.
- Get this working end-to-end with 2 browsers:
  1. User A creates duel.
  2. User B joins duel.
  3. Both see same current question in realtime.
  4. Both submit answer.
  5. Question advances.
  6. Match finishes and result is shown.

### Step 1) Add missing read/query endpoints (backend)
- Why:
  - UI cannot be realtime without read models that expose current match/question/answer state.
- How:
  - Add read-only queries with stable return shapes; never expose answer keys to clients.
- In `convex/gameplay.ts` / `convex/matches.ts`, add:
  - `getMatchState(matchId)` -> returns `matchState` by `matchId`.
  - `getCurrentQuestionForMatch(matchId)` -> resolve `matchState.currentQuestion` + `matchQuestions` + `questions` (without answer key).
  - `getMyAnswerForCurrentQuestion(matchId)` -> returns whether current user already submitted.
  - `getAnswersCountForCurrentQuestion(matchId)` -> count for status/fairness UI.
  - Optional: `getLiveScore(matchId)` -> lightweight score from current submitted correct answers.
- Existing `convex/matches.ts` functions already sufficient for initial lobby:
  - `createMatch`
  - `joinMatch`
  - `getWaitingMatchesByMode`
  - `getMatchById`

### Step 2) Arena state model (frontend)
- Why:
  - Arena is currently static; realtime duel requires subscribed state from Convex.
- How:
  - Replace hardcoded values with query-driven render states and mutation-driven actions.
- In `src/app/arena/page.tsx`, wire to Convex:
  - `useQuery(api.matches.getMatchById, { matchId })`
  - `useQuery(api.gameplay.getMatchState, { matchId })`
  - `useQuery(api.gameplay.getCurrentQuestionForMatch, { matchId })`
  - `useQuery(api.gameplay.getMyAnswerForCurrentQuestion, { matchId })`
  - `useMutation(api.gameplay.submitAnswer)`
  - `useMutation(api.gameplay.advanceQuestion)`
- Use URL query param as match id source for now: `?matchId=...`.

### Step 3) Minimal lobby flow (dashboard)
- Why:
  - Users need a deterministic way to pair without building a full queue system first.
- How:
  - Reuse existing waiting-match query: join first available duel or create one, then navigate with `matchId`.
- On "Start Matchmaking":
  - Try `getWaitingMatchesByMode("duel")`.
  - If waiting match exists -> `joinMatch`.
  - Else -> `createMatch`.
  - Route to `/arena?matchId=...`.

### Step 4) Submit + advance logic (arena)
- Why:
  - This is the core gameplay loop; without this, realtime UI is only visual.
- How:
  - Submit exactly once per user/question; gate interactions via query state; show backend errors directly.
- On option click:
  - Call `submitAnswer({ matchId, matchQuestionId, submittedAnswer, responseTime })`.
  - Disable options after successful submit (based on `getMyAnswerForCurrentQuestion`).
- Advance behavior:
  - Allow participants to call `advanceQuestion({ matchId })`.
  - Surface backend fairness/timer errors to user when thrown.

### Step 5) Timer UX (client-side display)
- Why:
  - Timer is core to game feel and fairness signaling.
- How:
  - Derive local countdown from `questionEndsAt`, but trust backend decisions for validity and advancement.
- Use `state.questionEndsAt`:
  - `remainingMs = Math.max(0, questionEndsAt - Date.now())`
  - Render timer bar + seconds.
  - When zero, show "waiting for advance" (backend remains source of truth).

### Step 6) Finish screen
- Why:
  - Clear match closure is required for user trust and replayability.
- How:
  - Switch UI into result mode once backend marks match as finished; hide active controls.
- When `match.status === "finished"`:
  - Fetch `getMatchResult(matchId)`.
  - Render winner + score.
  - Hide answer controls.

### Important gotchas
- Why:
  - These are the common integration mistakes likely to waste time during implementation.
- How:
  - Validate each gotcha explicitly while wiring and during 2-browser tests.
- `submitAnswer` expects `matchQuestionId` (not `questionId`).
- `advanceQuestion` only succeeds when fairness/timer rules pass; handle thrown errors in UI.
- Arena is currently static mock; implement this as one full vertical slice, not partial wiring.
