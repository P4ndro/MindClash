# MindClash Backend TODO

## Deferred from latest gameplay hardening

### 1) Team-mode scoring policy (clarify and enforce)
- Decide scoring rule for team questions:
  - Option A: at most one point per team per question (first correct only).
  - Option B: multiple members can score on the same question.
- Update `convex/gameplay.ts` score computation to match chosen policy.
- Add tests for duplicates from same team on one question.

### 2) Role/admin protection for question management
- Restrict `createQuestion` and `assignQuestionsToMatch` in `convex/questions.ts`.
- Add role field/claims mapping strategy (e.g., admin/interviewer) and enforce server-side checks.
- Return clear authorization errors for unauthorized callers.

### 3) Frontend contract and integration test pass
- Validate these 5 end-to-end scenarios:
  1. Happy path: create -> join -> assign -> submit -> advance -> finish.
  2. Timeout advance: one side does not answer, timer expires, advance succeeds.
  3. Duplicate submit: second submission for same user/question is rejected.
  4. Unauthorized submit: non-participant cannot submit.
  5. Tie finish: equal score finalizes with no duel winner.
- Document expected API responses and error messages used by UI.
