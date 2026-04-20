import { describe, it, expect } from "vitest";
import {
  computeMatchScores,
  QuestionAnswers,
  ScoringInput,
} from "../gameplayScoring";

function question(
  id: string,
  answers: Array<{ userId: string; isCorrect: boolean }>,
): QuestionAnswers {
  return { matchQuestionId: id, answers };
}

describe("computeMatchScores - duel mode", () => {
  const baseInput = (qs: QuestionAnswers[]): ScoringInput => ({
    mode: "duel",
    player1Id: "p1",
    player2Id: "p2",
    questions: qs,
  });

  it("counts one point per correct answer per player", () => {
    const result = computeMatchScores(
      baseInput([
        question("q1", [
          { userId: "p1", isCorrect: true },
          { userId: "p2", isCorrect: false },
        ]),
        question("q2", [
          { userId: "p1", isCorrect: true },
          { userId: "p2", isCorrect: true },
        ]),
      ]),
    );

    expect(result.player1Score).toBe(2);
    expect(result.player2Score).toBe(1);
    expect(result.winnerUserId).toBe("p1");
  });

  it("returns undefined winner on ties", () => {
    const result = computeMatchScores(
      baseInput([
        question("q1", [
          { userId: "p1", isCorrect: true },
          { userId: "p2", isCorrect: true },
        ]),
      ]),
    );

    expect(result.player1Score).toBe(1);
    expect(result.player2Score).toBe(1);
    expect(result.winnerUserId).toBeUndefined();
  });

  it("ignores answers from non-participants", () => {
    const result = computeMatchScores(
      baseInput([
        question("q1", [
          { userId: "p1", isCorrect: true },
          { userId: "ghost", isCorrect: true },
        ]),
      ]),
    );

    expect(result.player1Score).toBe(1);
    expect(result.player2Score).toBe(0);
    expect(result.winnerUserId).toBe("p1");
  });

  it("handles zero-zero ties without awarding a winner", () => {
    const result = computeMatchScores(
      baseInput([
        question("q1", [
          { userId: "p1", isCorrect: false },
          { userId: "p2", isCorrect: false },
        ]),
      ]),
    );

    expect(result.player1Score).toBe(0);
    expect(result.player2Score).toBe(0);
    expect(result.winnerUserId).toBeUndefined();
  });
});

describe("computeMatchScores - team mode (Option A: one point per team per question)", () => {
  const teamMatchInput = (
    qs: QuestionAnswers[],
    membership: Record<string, string[]>,
  ): ScoringInput => ({
    mode: "team",
    team1Id: "t1",
    team2Id: "t2",
    questions: qs,
    userTeamMembership: membership,
  });

  it("awards one point per team per question even when multiple members answer correctly", () => {
    const result = computeMatchScores(
      teamMatchInput(
        [
          question("q1", [
            { userId: "t1_memberA", isCorrect: true },
            { userId: "t1_memberB", isCorrect: true },
            { userId: "t2_memberA", isCorrect: true },
          ]),
        ],
        {
          t1_memberA: ["t1"],
          t1_memberB: ["t1"],
          t2_memberA: ["t2"],
        },
      ),
    );

    // Option A: each team scores at most 1 per question regardless of duplicates.
    expect(result.player1Score).toBe(1);
    expect(result.player2Score).toBe(1);
    expect(result.winnerUserId).toBeUndefined();
  });

  it("does not double count when the same user appears twice in answers", () => {
    const result = computeMatchScores(
      teamMatchInput(
        [
          question("q1", [
            { userId: "t1_memberA", isCorrect: true },
            { userId: "t1_memberA", isCorrect: true },
          ]),
        ],
        { t1_memberA: ["t1"] },
      ),
    );

    expect(result.player1Score).toBe(1);
    expect(result.player2Score).toBe(0);
  });

  it("awards zero to a team whose members answered incorrectly", () => {
    const result = computeMatchScores(
      teamMatchInput(
        [
          question("q1", [
            { userId: "t1_memberA", isCorrect: false },
            { userId: "t2_memberA", isCorrect: true },
          ]),
        ],
        {
          t1_memberA: ["t1"],
          t2_memberA: ["t2"],
        },
      ),
    );

    expect(result.player1Score).toBe(0);
    expect(result.player2Score).toBe(1);
  });

  it("ignores answers from users not on either team", () => {
    const result = computeMatchScores(
      teamMatchInput(
        [
          question("q1", [
            { userId: "outsider", isCorrect: true },
            { userId: "t2_memberA", isCorrect: true },
          ]),
        ],
        {
          outsider: ["tX"],
          t2_memberA: ["t2"],
        },
      ),
    );

    expect(result.player1Score).toBe(0);
    expect(result.player2Score).toBe(1);
  });

  it("accumulates across multiple questions correctly", () => {
    const result = computeMatchScores(
      teamMatchInput(
        [
          question("q1", [
            { userId: "a", isCorrect: true },
            { userId: "b", isCorrect: true },
          ]),
          question("q2", [
            { userId: "a", isCorrect: false },
            { userId: "c", isCorrect: true },
          ]),
          question("q3", [
            { userId: "b", isCorrect: false },
            { userId: "c", isCorrect: false },
          ]),
        ],
        {
          a: ["t1"],
          b: ["t1"],
          c: ["t2"],
        },
      ),
    );

    expect(result.player1Score).toBe(1); // only q1 from team1
    expect(result.player2Score).toBe(1); // only q2 from team2
  });

  it("never sets a duel winnerUserId in team mode", () => {
    const result = computeMatchScores(
      teamMatchInput(
        [
          question("q1", [{ userId: "a", isCorrect: true }]),
        ],
        { a: ["t1"] },
      ),
    );

    expect(result.winnerUserId).toBeUndefined();
  });
});
