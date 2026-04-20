/**
 * Pure scoring helpers for match finalization.
 *
 * Kept framework-free so the policy can be unit tested without a Convex
 * runtime. See `convex/__tests__/gameplayScoring.test.ts` for the contract
 * these helpers are expected to satisfy.
 *
 * Team scoring policy (decided and enforced here):
 *   Option A - At most one point per team per question (first correct wins).
 *
 *   Rationale:
 *     - Keeps round-by-round scores bounded to {0,1,2} per question regardless
 *       of team size, so ratings remain comparable across team shapes.
 *     - Removes the "load the team with alts" exploit that Option B enables.
 *     - Matches how most trivia/quiz team formats score rounds.
 *
 *   If you want to change the policy, change `scoreQuestionForTeams` and update
 *   the tests. Do NOT sprinkle scoring logic back into `finalizeMatch`.
 */

export type ScoringMode = "duel" | "team";

export type AnswerRecord = {
  userId: string;
  isCorrect: boolean;
};

export type QuestionAnswers = {
  matchQuestionId: string;
  answers: AnswerRecord[];
};

export type ScoringInput = {
  mode: ScoringMode;
  player1Id?: string;
  player2Id?: string;
  team1Id?: string;
  team2Id?: string;
  questions: QuestionAnswers[];
  /** userId -> list of teamIds the user is a member of. */
  userTeamMembership?: Record<string, string[] | undefined>;
};

export type ScoringOutput = {
  player1Score: number;
  player2Score: number;
  /** Only meaningful for duel mode; undefined on ties or team mode. */
  winnerUserId?: string;
};

function scoreQuestionForDuel(
  question: QuestionAnswers,
  player1Id: string | undefined,
  player2Id: string | undefined,
): { p1: number; p2: number } {
  let p1 = 0;
  let p2 = 0;
  for (const answer of question.answers) {
    if (!answer.isCorrect) continue;
    if (player1Id && answer.userId === player1Id) p1 += 1;
    if (player2Id && answer.userId === player2Id) p2 += 1;
  }
  return { p1, p2 };
}

function scoreQuestionForTeams(
  question: QuestionAnswers,
  team1Id: string | undefined,
  team2Id: string | undefined,
  userTeamMembership: Record<string, string[] | undefined>,
): { t1: number; t2: number } {
  let team1Scored = false;
  let team2Scored = false;

  for (const answer of question.answers) {
    if (!answer.isCorrect) continue;
    const teams = userTeamMembership[answer.userId] ?? [];
    if (team1Id && !team1Scored && teams.includes(team1Id)) {
      team1Scored = true;
    }
    if (team2Id && !team2Scored && teams.includes(team2Id)) {
      team2Scored = true;
    }
    if (team1Scored && team2Scored) break;
  }

  return {
    t1: team1Scored ? 1 : 0,
    t2: team2Scored ? 1 : 0,
  };
}

export function computeMatchScores(input: ScoringInput): ScoringOutput {
  let player1Score = 0;
  let player2Score = 0;

  if (input.mode === "duel") {
    for (const question of input.questions) {
      const { p1, p2 } = scoreQuestionForDuel(question, input.player1Id, input.player2Id);
      player1Score += p1;
      player2Score += p2;
    }

    let winnerUserId: string | undefined;
    if (player1Score > player2Score) winnerUserId = input.player1Id;
    else if (player2Score > player1Score) winnerUserId = input.player2Id;
    return { player1Score, player2Score, winnerUserId };
  }

  const membership = input.userTeamMembership ?? {};
  for (const question of input.questions) {
    const { t1, t2 } = scoreQuestionForTeams(
      question,
      input.team1Id,
      input.team2Id,
      membership,
    );
    player1Score += t1;
    player2Score += t2;
  }

  return { player1Score, player2Score };
}
