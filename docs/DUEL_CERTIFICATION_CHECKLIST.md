# Duel Certification Checklist

Run this checklist after every gameplay or matchmaking change before merging.

## Preconditions

- `npx convex dev` is running.
- `npm run dev` is running.
- Two separate browser sessions are available (different Clerk accounts).
- Both accounts have completed profile sync (`users` row exists).

## Certification Pass

### 1) Same queue -> same match

- In both browsers choose identical queue settings:
  - `grade`
  - `faculty` (if college)
  - `topic`
- Start matchmaking in browser A, then browser B.
- Verify both users land in arena with the same `matchId`.

Pass criteria:
- Both clients subscribe and render one shared match.
- No unauthorized/session sync errors block initial gameplay.

### 2) Timeout auto-advance

- On question 1:
  - Browser A submits an answer quickly.
  - Browser B does not submit.
- Wait for timer to hit `0.0s`.
- Verify arena auto-advances to the next question without manual intervention.

Pass criteria:
- UI does not get stuck on "Timer ended. Waiting for advance...".
- Next question appears on both clients.

### 3) Duplicate submit safety

- On a fresh question, submit once successfully in browser A.
- Attempt a second submit for the same question (double click/retry attempt).

Pass criteria:
- Backend rejects duplicate with `duplicate_submit`.
- UI remains stable and keeps "already answered" state.
- No fatal red error state.

### 4) Non-participant protection

- Open a third browser/account not in the match.
- Try to enter the same arena URL and submit/advance actions.

Pass criteria:
- Backend blocks action with `forbidden_participant`.
- Client redirects to matchmaking or shows non-participant UX.

### 5) Final result consistency (including tie)

- Complete all questions in the match.
- Verify both clients reach finished state and show same final scores/winner.
- Run at least one tie case (equal correct answers).

Pass criteria:
- `winnerUserId` is consistent across clients.
- Tie shows no winner and expected tie messaging.

## Sign-off Template

Copy this into PR notes or release notes:

```text
Duel certification:
- [X] Same queue -> same matchId
- [X] Timeout auto-advance
- [X] Duplicate submit blocked
- [ ] Non-participant blocked (needs final debug hardening)
- [X] Final result consistent (incl. tie)
Date: 2026-04-17
Tester(s): sandr
Build/commit: working tree (uncommitted)
Notes: Item 4 works partially but requires deterministic non-participant UX before final sign-off.
```
