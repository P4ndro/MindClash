# MindClash Realtime API Contract

This document freezes the Convex mutation/query contract that the frontend
relies on for the duel arena flow. It is the single source of truth for:

- the shape of successful responses the UI should expect,
- the error messages the UI should recognise and present to players,
- the 5 end-to-end scenarios that must always behave as described below.

The contract applies to the mutations/queries in:
- `convex/matches.ts`
- `convex/gameplay.ts`
- `convex/questions.ts`
- `convex/users.ts`

## Error code convention

Errors whose message starts with a lowercase `code:` prefix are considered
machine-readable. The UI may branch on them to decide how to render the
failure. All other errors should be treated as generic user-facing strings.

Currently defined prefixes (see `convex/auth.ts`):

| Code                | Meaning                                                |
| ------------------- | ------------------------------------------------------ |
| `unauthenticated:`  | Caller has no Clerk identity. Prompt sign in.          |
| `unknown_user:`     | Caller is signed in but has no `users` row yet. Wait.  |
| `forbidden_admin:`  | Caller is not an admin. Hide the admin-only UI.        |

Legacy/plain error messages that the UI also special-cases:

| Message                                       | Meaning                     |
| --------------------------------------------- | --------------------------- |
| `Match is not active`                         | Match already ended         |
| `Match not found`                             | Invalid `matchId`           |
| `Question deadline has passed`                | Timer expired; advance next |
| `Answer already submitted for this question`  | UI should disable submit    |
| `You are not a participant in this duel`      | Show non-participant UI     |

## Scenario 1 - Happy path

`findOrCreateDuelMatch -> submitAnswer -> advanceQuestion -> ... -> finish`

### Sequence
1. Player 1 calls `matches.findOrCreateDuelMatch` with questionIds - a new
   waiting match is created. Response: `{ matchId, joinedExisting: false }`.
2. Player 2 calls `matches.findOrCreateDuelMatch` with the same queue. The
   server finds the waiting match, sets `player2Id`, flips status to
   `active`, and creates the initial `matchState`. Response:
   `{ matchId: sameId, joinedExisting: true }`.
3. Each client subscribes to `gameplay.getMatchState`,
   `gameplay.getCurrentQuestionForMatch`,
   `gameplay.getMyAnswerForCurrentQuestion`,
   `gameplay.getAnswersCountForCurrentQuestion`.
4. Each player calls `gameplay.submitAnswer` once per question. Response:
   `{ userAnswerId, isCorrect }`.
5. When both players submitted, any client calls
   `gameplay.advanceQuestion`. Response while there are more questions:
   `{ hasNext: true, nextQuestion }`.
6. On the last question, `advanceQuestion` finalises and responds with
   `{ hasNext: false, nextQuestion: null, player1Score, player2Score, winnerUserId }`.

### UI expectations
- While status is `waiting`, show "Waiting for opponent to join...".
- Once `phase === "question"` and `hasAnswered === true`, show
  "Answer submitted. Waiting for opponent to answer..." until the opponent
  catches up or the timer expires.
- After finalisation, show winner/tie screen driven by `winnerUserId`.

## Scenario 2 - Timeout advance

One side never submits.

### Sequence
1. Player 1 submits; Player 2 does not.
2. `matchState.questionEndsAt` elapses.
3. Any client calls `gameplay.advanceQuestion`. Because
   `now > state.questionEndsAt`, the server skips the "both players
   submitted" guard and advances anyway.

### UI expectations
- While `now >= questionEndsAt` and there is no advance yet, show
  "Timer ended. Waiting for advance..." - the UI should call
  `advanceQuestion` automatically (with idempotent handling).
- If `advanceQuestion` throws `Only active matches can advance` or returns
  `{ alreadyFinished: true }`, treat this as a state sync, not a fatal
  error (another client already advanced/finished).

## Scenario 3 - Duplicate submit

Same user submits twice for the same question.

### Sequence
1. First `submitAnswer` succeeds with `{ userAnswerId, isCorrect }`.
2. Second `submitAnswer` for the same `(userId, matchQuestionId)` rejects
   with error message: `Answer already submitted for this question`.

### UI expectations
- After `submitAnswer` resolves the first time, set local "submitted"
  state and disable the submit button.
- If the user bypasses the guard (double click race), surface the server
  error as a toast: "You already answered this question."

## Scenario 4 - Unauthorized submit

A user who is not a participant calls `submitAnswer`.

### Sequence
1. `gameplay.submitAnswer` loads the match.
2. `assertParticipant` throws `You are not a participant in this duel`
   (or `... in this team match` for team mode).

### UI expectations
- The arena should not expose `submitAnswer` to non-participants at all.
- If it does reach the server anyway, the UI should redirect to
  `/matchmaking` or show "You are not part of this match.".

## Scenario 5 - Tie finish

Both players end with equal scores.

### Sequence
1. Final `advanceQuestion` triggers `finalizeMatch`.
2. `finalizeMatch` computes scores via `computeMatchScores`
   (`convex/gameplayScoring.ts`).
3. Because `player1Score === player2Score`, `winnerUserId` is set to
   `undefined` and ratings deltas are skipped. `matchResults` is still
   written with both scores. `matches.winnerUserId` stays undefined.

### UI expectations
- On the results screen, show "Tie - no rating change" when
  `winnerUserId === undefined`.
- Do not claim a winner. `userCourseRatings` remain unchanged.

## Admin-only endpoints

`createQuestion` and `assignQuestionsToMatch` are gated by
`requireAdmin` in `convex/auth.ts`. Non-admin callers will receive:

- `unauthenticated: You must be signed in to perform this action.` - when
  the caller has no Clerk identity.
- `forbidden_admin: Admin role required for this action.` - when the
  caller is signed in but not promoted.

### Granting the first admin

Two supported paths:

1. Env bootstrap - set `ADMIN_CLERK_IDS` in Convex env (comma-separated
   Clerk `sub` values). `requireAdmin` treats listed ids as admins even
   without a persisted role. Then call `users.setUserRole` to persist
   it.
2. `users.claimFirstAdmin` - the first signed-in user to call this
   mutation becomes the admin. After one admin exists the mutation
   rejects with `forbidden_admin:`.

Further promotions go through `users.setUserRole` which itself requires
`requireAdmin`.

## Team scoring policy

See `convex/gameplayScoring.ts` for the pure implementation and
`convex/__tests__/gameplayScoring.test.ts` for the behavioural
specification.

- Duel mode: +1 per correct answer per player; winner is the higher
  score, undefined on ties.
- Team mode: +1 per team per question if any team member answered
  correctly; additional correct answers from the same team on the same
  question do **not** stack (Option A). Duel winner is always undefined.
