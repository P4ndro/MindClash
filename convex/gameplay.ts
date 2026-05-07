import { internal } from "./_generated/api";
import {
  internalAction,
  internalMutation,
  mutation,
  query,
  MutationCtx,
  QueryCtx,
} from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { computeMatchScores, QuestionAnswers } from "./gameplayScoring";
import { requireAdmin } from "./auth";
import {
  getOpenEndedRegradeDelayMs,
  shouldFinalizeMatchWithPendingOpenEnded,
  shouldQueueOpenEndedRegrade,
} from "./gameplayAiPolicy";

type MatchDoc = Doc<"matches">;
type UserId = Id<"users">;
type GameplayCtx = MutationCtx | QueryCtx;
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

async function gradeOpenEndedWithGemini(params: {
  questionText: string;
  expectedAnswer: string;
  submittedAnswer: string;
  difficulty: "easy" | "medium" | "hard";
  category: string;
}): Promise<{ aiScore: number; aiConfidence: number; gradingReason: string; isCorrect: boolean }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("ai_unavailable: GEMINI_API_KEY is missing");
  }

  const prompt = `
You are grading a competitive quiz answer strictly.
Return JSON only.

Question: ${params.questionText}
Category: ${params.category}
Difficulty: ${params.difficulty}
Expected canonical answer: ${params.expectedAnswer}
Submitted answer: ${params.submittedAnswer}

Scoring rules:
- Be strict and fair; do NOT be lenient.
- 1.0 means semantically equivalent and correct.
- 0.0 means incorrect.
- Minor spelling mistakes may pass only if meaning is exact.
- If ambiguous, score low.

Output:
{
  "aiScore": number,          // 0..1
  "aiConfidence": number,     // 0..1
  "gradingReason": string
}
`.trim();

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
        },
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`ai_unavailable: Gemini request failed (${response.status})`);
  }

  const data = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) throw new Error("ai_unavailable: Gemini returned empty grading response");

  let parsed: { aiScore?: number; aiConfidence?: number; gradingReason?: string };
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("ai_unavailable: Gemini returned invalid grading JSON");
  }

  const aiScore = Math.max(0, Math.min(1, Number(parsed.aiScore ?? 0)));
  const aiConfidence = Math.max(0, Math.min(1, Number(parsed.aiConfidence ?? 0)));
  const gradingReason = (parsed.gradingReason ?? "AI grading unavailable").toString().slice(0, 500);
  const isCorrect = aiScore >= 0.75 && aiConfidence >= 0.6;

  return { aiScore, aiConfidence, gradingReason, isCorrect };
}

export const applyOpenEndedGrade = internalMutation({
  args: {
    userAnswerId: v.id("userAnswers"),
    isCorrect: v.optional(v.boolean()),
    gradingStatus: v.union(v.literal("pending"), v.literal("graded"), v.literal("review_required")),
    aiScore: v.optional(v.number()),
    aiConfidence: v.optional(v.number()),
    gradingReason: v.string(),
    aiModel: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userAnswerId, {
      isCorrect: args.isCorrect,
      gradingStatus: args.gradingStatus,
      aiScore: args.aiScore,
      aiConfidence: args.aiConfidence,
      gradingReason: args.gradingReason,
      aiModel: args.aiModel,
      updatedAt: Date.now(),
    });
  },
});

export const finalizeMatchIfReadyFromAnswer = internalMutation({
  args: {
    userAnswerId: v.id("userAnswers"),
  },
  handler: async (ctx, args) => {
    const userAnswer = await ctx.db.get(args.userAnswerId);
    if (!userAnswer) return;
    const matchQuestion = await ctx.db.get(userAnswer.matchQuestionId);
    if (!matchQuestion) return;
    const state = await ctx.db
      .query("matchState")
      .withIndex("by_matchId", (q) => q.eq("matchId", matchQuestion.matchId))
      .unique();
    if (!state || state.phase !== "review") return;
    const match = await ctx.db.get(matchQuestion.matchId);
    if (!match || match.status !== "active") return;
    await finalizeMatch(ctx, matchQuestion.matchId, Date.now());
  },
});

export const gradeOpenEndedWithGeminiJob = internalAction({
  args: {
    userAnswerId: v.id("userAnswers"),
    questionText: v.string(),
    expectedAnswer: v.string(),
    submittedAnswer: v.string(),
    difficulty: v.union(v.literal("easy"), v.literal("medium"), v.literal("hard")),
    category: v.string(),
    attempt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const attempt = Math.max(0, Math.floor(args.attempt ?? 0));
    try {
      const graded = await gradeOpenEndedWithGemini({
        questionText: args.questionText,
        expectedAnswer: args.expectedAnswer,
        submittedAnswer: args.submittedAnswer,
        difficulty: args.difficulty,
        category: args.category,
      });
      await ctx.runMutation(internal.gameplay.applyOpenEndedGrade, {
        userAnswerId: args.userAnswerId,
        isCorrect: graded.isCorrect,
        gradingStatus: "graded",
        aiScore: graded.aiScore,
        aiConfidence: graded.aiConfidence,
        gradingReason: graded.gradingReason,
        aiModel: GEMINI_MODEL,
      });
      await ctx.runMutation(internal.gameplay.finalizeMatchIfReadyFromAnswer, {
        userAnswerId: args.userAnswerId,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "AI grading failed.";
      if (shouldQueueOpenEndedRegrade(errorMessage, attempt)) {
        await ctx.runMutation(internal.gameplay.applyOpenEndedGrade, {
          userAnswerId: args.userAnswerId,
          gradingStatus: "pending",
          gradingReason: `AI temporarily unavailable. Retry ${attempt + 1} queued.`,
        });
        await ctx.scheduler.runAfter(
          getOpenEndedRegradeDelayMs(attempt),
          internal.gameplay.gradeOpenEndedWithGeminiJob,
          {
            ...args,
            attempt: attempt + 1,
          },
        );
      } else {
        await ctx.runMutation(internal.gameplay.applyOpenEndedGrade, {
          userAnswerId: args.userAnswerId,
          gradingStatus: "review_required",
          gradingReason:
            error instanceof Error
              ? `AI grading failed after retries: ${error.message}`.slice(0, 500)
              : "AI grading failed after retries, manual review required.",
        });
      }
      await ctx.runMutation(internal.gameplay.finalizeMatchIfReadyFromAnswer, {
        userAnswerId: args.userAnswerId,
      });
    }
  },
});

async function getCurrentUser(ctx: MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("unauthenticated: You must be signed in.");

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
    .unique();

  if (!user) throw new Error("unknown_user: Signed-in user profile not found.");
  return user;
}

async function assertParticipant(
  ctx: GameplayCtx,
  match: MatchDoc,
  userId: UserId,
) {
  if (match.mode === "duel") {
    const isPlayer = match.player1Id === userId || match.player2Id === userId;
    if (!isPlayer) throw new Error("forbidden_participant: You are not a participant in this duel");
    return;
  }

  const memberships = await ctx.db
    .query("teamMembers")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .collect();
  const teamIds = memberships.map((m) => m.teamId);
  const inTeam1 = Boolean(match.team1Id && teamIds.some((id) => id === match.team1Id));
  const inTeam2 = Boolean(match.team2Id && teamIds.some((id) => id === match.team2Id));

  if (!inTeam1 && !inTeam2) {
    throw new Error("forbidden_participant: You are not a participant in this team match");
  }
}

async function requireCurrentQueryUser(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("unauthenticated: You must be signed in.");

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
    .unique();
  if (!user) throw new Error("unknown_user: Signed-in user profile not found.");
  return user;
}

async function getCurrentQueryUserOptional(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
    .unique();
  return user ?? null;
}

function normalizeAnswer(value: string) {
  return value.trim().toLowerCase();
}

function isDeterministicOpenEndedMatch(submitted: string, expected: string) {
  const normalizedSubmitted = normalizeAnswer(submitted).replace(/\s+/g, " ");
  const normalizedExpected = normalizeAnswer(expected).replace(/\s+/g, " ");
  if (normalizedSubmitted === normalizedExpected) return true;

  const numericSubmitted = Number(normalizedSubmitted);
  const numericExpected = Number(normalizedExpected);
  if (Number.isFinite(numericSubmitted) && Number.isFinite(numericExpected)) {
    return numericSubmitted === numericExpected;
  }

  const submittedCompact = normalizedSubmitted.replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
  const expectedCompact = normalizedExpected.replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
  if (!submittedCompact || !expectedCompact) return false;

  if (submittedCompact === expectedCompact) return true;
  if (submittedCompact.includes(expectedCompact) || expectedCompact.includes(submittedCompact)) {
    return true;
  }

  const stopwords = new Set(["the", "a", "an", "of", "to", "and", "or", "in", "on", "for", "with"]);
  const submittedTokens = submittedCompact
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length > 1 && !stopwords.has(token));
  const expectedTokens = expectedCompact
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length > 1 && !stopwords.has(token));
  if (submittedTokens.length === 0 || expectedTokens.length === 0) return false;

  const submittedSet = new Set(submittedTokens);
  let overlap = 0;
  for (const token of expectedTokens) {
    if (submittedSet.has(token)) overlap += 1;
  }
  const overlapRatio = overlap / expectedTokens.length;
  if (overlapRatio >= 0.8) return true;
  return false;
}

function getDifficultyWeight(difficulty: "easy" | "medium" | "hard") {
  if (difficulty === "hard") return 3;
  if (difficulty === "medium") return 2;
  return 1;
}

function getQuestionDurationMsByDifficulty(difficulty: "easy" | "medium" | "hard") {
  if (difficulty === "hard") return 60_000;
  if (difficulty === "medium") return 45_000;
  return 30_000;
}

async function getOrCreateCourseRating(
  ctx: MutationCtx,
  userId: Id<"users">,
  course: string,
  now: number,
) {
  const existing = await ctx.db
    .query("userCourseRatings")
    .withIndex("by_user_course", (q) => q.eq("userId", userId).eq("course", course))
    .unique();

  if (existing) {
    return existing;
  }

  const insertedId = await ctx.db.insert("userCourseRatings", {
    userId,
    course,
    rating: 1000,
    createdAt: now,
    updatedAt: now,
  });

  const inserted = await ctx.db.get(insertedId);
  if (!inserted) throw new Error("Failed to create course rating");
  return inserted;
}

async function applyCourseRatingDelta(
  ctx: MutationCtx,
  userId: Id<"users">,
  course: string,
  delta: number,
  now: number,
) {
  const rating = await getOrCreateCourseRating(ctx, userId, course, now);
  await ctx.db.patch(rating._id, {
    rating: Math.max(100, rating.rating + delta),
    updatedAt: now,
  });
}

async function finalizeMatch(ctx: MutationCtx, matchId: Id<"matches">, now: number) {
  const match = await ctx.db.get(matchId);
  if (!match) throw new Error("Match not found");
  if (match.status === "finished") {
    const existingResult = await ctx.db
      .query("matchResults")
      .withIndex("by_matchId", (q) => q.eq("matchId", matchId))
      .unique();
    return {
      player1Score: existingResult?.player1Score ?? 0,
      player2Score: existingResult?.player2Score ?? 0,
      winnerUserId: match.winnerUserId,
      alreadyFinished: true,
    };
  }

  const matchQuestions = await ctx.db
    .query("matchQuestions")
    .withIndex("by_matchId", (q) => q.eq("matchId", matchId))
    .collect();

  const userTeamCache = new Map<string, string[]>();
  const scoringQuestions: QuestionAnswers[] = [];
  let pendingOpenEndedAnswers = 0;

  for (const mq of matchQuestions) {
    const questionDoc = await ctx.db.get(mq.questionId);
    const weight = questionDoc ? getDifficultyWeight(questionDoc.difficulty) : 1;
    const answersForQuestion = await ctx.db
      .query("userAnswers")
      .withIndex("by_matchQuestionId", (q) => q.eq("matchQuestionId", mq._id))
      .collect();

    scoringQuestions.push({
      matchQuestionId: mq._id.toString(),
      weight,
      answers: answersForQuestion.map((a) => ({
        userId: a.userId.toString(),
        isCorrect: a.isCorrect === true,
      })),
    });

    if ((questionDoc?.questionType ?? "open_ended") === "open_ended") {
      pendingOpenEndedAnswers += answersForQuestion.filter((a) => a.gradingStatus === "pending").length;
    }

    if (match.mode === "team") {
      for (const answer of answersForQuestion) {
        const userKey = answer.userId.toString();
        if (userTeamCache.has(userKey)) continue;
        const memberships = await ctx.db
          .query("teamMembers")
          .withIndex("by_userId", (q) => q.eq("userId", answer.userId))
          .collect();
        userTeamCache.set(
          userKey,
          memberships.map((m) => m.teamId.toString()),
        );
      }
    }
  }

  if (!shouldFinalizeMatchWithPendingOpenEnded(pendingOpenEndedAnswers)) {
    const state = await ctx.db
      .query("matchState")
      .withIndex("by_matchId", (q) => q.eq("matchId", matchId))
      .unique();
    if (state) {
      await ctx.db.patch(state._id, {
        phase: "review",
        timeRemaining: 0,
        questionEndsAt: now,
        updatedAt: now,
      });
    }
    return {
      gradingPending: true,
      pendingAnswers: pendingOpenEndedAnswers,
    };
  }

  const userTeamMembership: Record<string, string[]> = {};
  userTeamCache.forEach((value, key) => {
    userTeamMembership[key] = value;
  });

  const scores = computeMatchScores({
    mode: match.mode,
    player1Id: match.player1Id?.toString(),
    player2Id: match.player2Id?.toString(),
    team1Id: match.team1Id?.toString(),
    team2Id: match.team2Id?.toString(),
    questions: scoringQuestions,
    userTeamMembership,
  });

  const player1Score = scores.player1Score;
  const player2Score = scores.player2Score;
  const winnerUserId: Id<"users"> | undefined =
    match.mode === "duel" && scores.winnerUserId
      ? (scores.winnerUserId === match.player1Id?.toString()
          ? match.player1Id
          : match.player2Id)
      : undefined;

  const existingResult = await ctx.db
    .query("matchResults")
    .withIndex("by_matchId", (q) => q.eq("matchId", matchId))
    .unique();

  if (existingResult) {
    await ctx.db.patch(existingResult._id, {
      player1Score,
      player2Score,
      updatedAt: now,
    });
  } else {
    await ctx.db.insert("matchResults", {
      matchId,
      player1Score,
      player2Score,
      createdAt: now,
      updatedAt: now,
    });
  }

  await ctx.db.patch(matchId, {
    status: "finished",
    winnerUserId,
    endedAt: now,
    updatedAt: now,
  });

  if (match.mode === "duel" && match.topic && match.player1Id && match.player2Id) {
    if (player1Score > player2Score) {
      await applyCourseRatingDelta(ctx, match.player1Id, match.topic, 16, now);
      await applyCourseRatingDelta(ctx, match.player2Id, match.topic, -16, now);
    } else if (player2Score > player1Score) {
      await applyCourseRatingDelta(ctx, match.player2Id, match.topic, 16, now);
      await applyCourseRatingDelta(ctx, match.player1Id, match.topic, -16, now);
    } else {
      await getOrCreateCourseRating(ctx, match.player1Id, match.topic, now);
      await getOrCreateCourseRating(ctx, match.player2Id, match.topic, now);
    }
  }

  const state = await ctx.db
    .query("matchState")
    .withIndex("by_matchId", (q) => q.eq("matchId", matchId))
    .unique();
  if (state) {
    await ctx.db.patch(state._id, {
      phase: "finished",
      timeRemaining: 0,
      questionEndsAt: now,
      updatedAt: now,
    });
  }

  return { player1Score, player2Score, winnerUserId };
}

export const submitAnswer = mutation({
  args: {
    matchId: v.id("matches"),
    matchQuestionId: v.id("matchQuestions"),
    submittedAnswer: v.string(),
    responseTime: v.number(),
  },
  handler: async (ctx, args) => {
    if (args.responseTime < 0) {
      throw new Error("responseTime must be non-negative");
    }

    const now = Date.now();
    const currentUser = await getCurrentUser(ctx);

    const match = await ctx.db.get(args.matchId);
    if (!match) throw new Error("Match not found");
    if (match.status !== "active") throw new Error("stale_phase: Match is not active");

    await assertParticipant(ctx, match, currentUser._id);

    const state = await ctx.db
      .query("matchState")
      .withIndex("by_matchId", (q) => q.eq("matchId", args.matchId))
      .unique();
    if (!state) throw new Error("Match state not found");
    if (state.phase !== "question") {
      throw new Error("stale_phase: Answers can only be submitted during question phase");
    }
    if (state.questionEndsAt && now >= state.questionEndsAt) {
      throw new Error("deadline_passed: Question deadline has passed");
    }

    const matchQuestion = await ctx.db.get(args.matchQuestionId);
    if (!matchQuestion) throw new Error("Match question not found");
    if (matchQuestion.matchId !== args.matchId) {
      throw new Error("Question does not belong to this match");
    }
    if (matchQuestion.order !== state.currentQuestion) {
      throw new Error("This is not the current question");
    }

    const existingSubmission = await ctx.db
      .query("userAnswers")
      .withIndex("by_user_matchQuestion", (q) =>
        q.eq("userId", currentUser._id).eq("matchQuestionId", args.matchQuestionId),
      )
      .first();
    if (existingSubmission) {
      throw new Error("duplicate_submit: Answer already submitted for this question");
    }

    const questionDoc = await ctx.db.get(matchQuestion.questionId);
    if (!questionDoc) throw new Error("Question not found");
    const questionType = questionDoc.questionType ?? "open_ended";

    const submitted = args.submittedAnswer.trim();
    if (!submitted) {
      throw new Error("validation_error: submittedAnswer is required");
    }
    let isCorrect: boolean | undefined = undefined;
    let gradingStatus: "pending" | "graded" | "review_required" | undefined = undefined;
    if (questionType === "msq") {
      const answerDoc = await ctx.db
        .query("answers")
        .withIndex("by_questionId", (q) => q.eq("questionId", matchQuestion.questionId))
        .unique();
      if (!answerDoc?.correctValue) {
        throw new Error("Answer key not found for MSQ question");
      }
      isCorrect = normalizeAnswer(submitted) === normalizeAnswer(answerDoc.correctValue);
      gradingStatus = "graded";
    } else {
      gradingStatus = "pending";
    }

    const userAnswerId = await ctx.db.insert("userAnswers", {
      userId: currentUser._id,
      matchQuestionId: args.matchQuestionId,
      submittedAnswer: submitted,
      isCorrect,
      gradingStatus,
      aiScore: undefined,
      aiConfidence: undefined,
      gradingReason: undefined,
      aiModel: undefined,
      responseTime: args.responseTime,
      submittedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    if (questionType === "open_ended") {
      try {
        const answerDoc = await ctx.db
          .query("answers")
          .withIndex("by_questionId", (q) => q.eq("questionId", matchQuestion.questionId))
          .unique();
        const expectedAnswer = answerDoc?.correctValue?.trim();
        if (!expectedAnswer) {
          await ctx.db.patch(userAnswerId, {
            gradingStatus: "review_required",
            gradingReason: "No canonical answer available for this open-ended question.",
            updatedAt: Date.now(),
          });
        } else {
          const matched = isDeterministicOpenEndedMatch(submitted, expectedAnswer);
          await ctx.db.patch(userAnswerId, {
            isCorrect: matched,
            gradingStatus: "graded",
            aiScore: matched ? 1 : 0,
            aiConfidence: 1,
            gradingReason: matched
              ? "Matched canonical answer."
              : "Did not match canonical answer.",
            aiModel: "canonical_answer_compare_v1",
            updatedAt: Date.now(),
          });
          isCorrect = matched;
        }
      } catch (error) {
        await ctx.db.patch(userAnswerId, {
          isCorrect: false,
          gradingStatus: "graded",
          aiScore: 0,
          aiConfidence: 0,
          gradingReason:
            error instanceof Error
              ? `Grading failed, scored 0: ${error.message}`.slice(0, 500)
              : "Grading failed, scored 0.",
          updatedAt: Date.now(),
        });
      }
    }

    return { userAnswerId, isCorrect };
  },
});

export const advanceQuestion = mutation({
  args: {
    matchId: v.id("matches"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const currentUser = await getCurrentUser(ctx);

    const match = await ctx.db.get(args.matchId);
    if (!match) throw new Error("Match not found");
    if (match.status === "finished") {
      const existingResult = await ctx.db
        .query("matchResults")
        .withIndex("by_matchId", (q) => q.eq("matchId", args.matchId))
        .unique();
      return {
        hasNext: false,
        nextQuestion: null,
        player1Score: existingResult?.player1Score ?? 0,
        player2Score: existingResult?.player2Score ?? 0,
        winnerUserId: match.winnerUserId,
        alreadyFinished: true,
      };
    }
    if (match.status !== "active") throw new Error("stale_phase: Only active matches can advance");

    await assertParticipant(ctx, match, currentUser._id);

    const state = await ctx.db
      .query("matchState")
      .withIndex("by_matchId", (q) => q.eq("matchId", args.matchId))
      .unique();
    if (!state) throw new Error("Match state not found");
    if (state.phase === "finished") {
      const existingResult = await ctx.db
        .query("matchResults")
        .withIndex("by_matchId", (q) => q.eq("matchId", args.matchId))
        .unique();
      return {
        hasNext: false,
        nextQuestion: null,
        player1Score: existingResult?.player1Score ?? 0,
        player2Score: existingResult?.player2Score ?? 0,
        winnerUserId: match.winnerUserId,
        alreadyFinished: true,
      };
    }

    const questions = await ctx.db
      .query("matchQuestions")
      .withIndex("by_match_order", (q) => q.eq("matchId", args.matchId))
      .collect();
    if (questions.length === 0) throw new Error("No questions assigned to match");
    if (state.currentQuestion < 0 || state.currentQuestion >= questions.length) {
      throw new Error("Invalid current question state");
    }

    const currentLink = questions[state.currentQuestion];
    const answersForCurrent = await ctx.db
      .query("userAnswers")
      .withIndex("by_matchQuestionId", (q) => q.eq("matchQuestionId", currentLink._id))
      .collect();
    // Allow a small clock-skew buffer so clients at ~0.0s can still advance
    // even if server time is a few hundred milliseconds behind.
    const deadlinePassed = Boolean(state.questionEndsAt && now + 750 >= state.questionEndsAt);

    if (!deadlinePassed) {
      if (match.mode === "duel") {
        const hasPlayer1Answer = Boolean(
          match.player1Id && answersForCurrent.some((a) => a.userId === match.player1Id),
        );
        const hasPlayer2Answer = Boolean(
          match.player2Id && answersForCurrent.some((a) => a.userId === match.player2Id),
        );
        if (!hasPlayer1Answer || !hasPlayer2Answer) {
          return {
            hasNext: true,
            nextQuestion: state.currentQuestion,
            waitingForAnswers: true,
          };
        }
      } else {
        const memberCache = new Map<string, Id<"teams">[]>();
        let team1Answered = false;
        let team2Answered = false;

        for (const answer of answersForCurrent) {
          const cacheKey = answer.userId.toString();
          let teamIds = memberCache.get(cacheKey);
          if (!teamIds) {
            const memberships = await ctx.db
              .query("teamMembers")
              .withIndex("by_userId", (q) => q.eq("userId", answer.userId))
              .collect();
            teamIds = memberships.map((m) => m.teamId);
            memberCache.set(cacheKey, teamIds ?? []);
          }
          const resolvedTeamIds = teamIds ?? [];
          if (match.team1Id && resolvedTeamIds.some((t) => t === match.team1Id)) {
            team1Answered = true;
          }
          if (match.team2Id && resolvedTeamIds.some((t) => t === match.team2Id)) {
            team2Answered = true;
          }
          if (team1Answered && team2Answered) break;
        }

        if (!team1Answered || !team2Answered) {
          return {
            hasNext: true,
            nextQuestion: state.currentQuestion,
            waitingForAnswers: true,
          };
        }
      }
    }

    const nextQuestion = state.currentQuestion + 1;
    if (nextQuestion >= questions.length) {
      const result = await finalizeMatch(ctx, args.matchId, now);
      return { hasNext: false, nextQuestion: null, ...result };
    }

    const nextQuestionLink = questions[nextQuestion];
    const nextQuestionDoc = await ctx.db.get(nextQuestionLink.questionId);
    const questionDurationMs = nextQuestionDoc
      ? getQuestionDurationMsByDifficulty(nextQuestionDoc.difficulty)
      : 30_000;

    await ctx.db.patch(state._id, {
      currentQuestion: nextQuestion,
      phase: "question",
      timeRemaining: questionDurationMs,
      questionStartedAt: now,
      questionEndsAt: now + questionDurationMs,
      updatedAt: now,
    });
    return { hasNext: true, nextQuestion };
  },
});

export const finishMatch = mutation({
  args: {
    matchId: v.id("matches"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const currentUser = await getCurrentUser(ctx);

    const match = await ctx.db.get(args.matchId);
    if (!match) throw new Error("Match not found");
    if (match.status === "finished") {
      const existingResult = await ctx.db
        .query("matchResults")
        .withIndex("by_matchId", (q) => q.eq("matchId", args.matchId))
        .unique();
      return {
        player1Score: existingResult?.player1Score ?? 0,
        player2Score: existingResult?.player2Score ?? 0,
        winnerUserId: match.winnerUserId,
        alreadyFinished: true,
      };
    }
    if (match.status !== "active") {
      throw new Error("stale_phase: Only active matches can be finished");
    }

    await assertParticipant(ctx, match, currentUser._id);
    return await finalizeMatch(ctx, args.matchId, now);
  },
});

export const getMatchResult = query({
  args: {
    matchId: v.id("matches"),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentQueryUser(ctx);
    const match = await ctx.db.get(args.matchId);
    if (!match) throw new Error("Match not found");
    await assertParticipant(ctx, match, user._id);

    const result = await ctx.db
      .query("matchResults")
      .withIndex("by_matchId", (q) => q.eq("matchId", args.matchId))
      .unique();

    return { match, result };
  },
});

export const getMatchBreakdown = query({
  args: {
    matchId: v.id("matches"),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentQueryUser(ctx);
    const match = await ctx.db.get(args.matchId);
    if (!match) throw new Error("Match not found");
    await assertParticipant(ctx, match, user._id);

    const links = await ctx.db
      .query("matchQuestions")
      .withIndex("by_match_order", (q) => q.eq("matchId", args.matchId))
      .collect();

    const rounds = await Promise.all(
      links.map(async (link) => {
        const question = await ctx.db.get(link.questionId);
        if (!question) return null;

        const myAnswer = await ctx.db
          .query("userAnswers")
          .withIndex("by_user_matchQuestion", (q) =>
            q.eq("userId", user._id).eq("matchQuestionId", link._id),
          )
          .first();

        const weight = getDifficultyWeight(question.difficulty);
        const gradingStatus = myAnswer
          ? myAnswer.gradingStatus === "review_required"
            ? "review_required"
            : myAnswer.gradingStatus === "pending"
              ? "pending"
              : myAnswer.isCorrect === true
                ? "correct"
                : myAnswer.isCorrect === false
                  ? "incorrect"
                  : "pending"
          : "unanswered";
        const pointsEarned = myAnswer?.isCorrect === true ? weight : 0;

        return {
          matchQuestionId: link._id,
          order: link.order,
          questionText: question.text,
          category: question.category,
          difficulty: question.difficulty,
          questionType: question.questionType ?? "open_ended",
          submittedAnswer: myAnswer?.submittedAnswer ?? null,
          gradingStatus,
          weight,
          pointsEarned,
        };
      }),
    );

    return rounds.filter((round) => round !== null);
  },
});

export const getMatchGradingDebug = query({
  args: {
    matchId: v.id("matches"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const links = await ctx.db
      .query("matchQuestions")
      .withIndex("by_match_order", (q) => q.eq("matchId", args.matchId))
      .collect();
    const rows = await Promise.all(
      links.map(async (link) => {
        const question = await ctx.db.get(link.questionId);
        const answers = await ctx.db
          .query("userAnswers")
          .withIndex("by_matchQuestionId", (q) => q.eq("matchQuestionId", link._id))
          .collect();
        return {
          order: link.order,
          questionText: question?.text ?? "missing_question",
          questionType: question?.questionType ?? "open_ended",
          answers: answers.map((a) => ({
            userId: a.userId,
            submittedAnswer: a.submittedAnswer,
            gradingStatus: a.gradingStatus ?? null,
            isCorrect: a.isCorrect ?? null,
            aiModel: a.aiModel ?? null,
            gradingReason: a.gradingReason ?? null,
            aiScore: a.aiScore ?? null,
            aiConfidence: a.aiConfidence ?? null,
          })),
        };
      }),
    );
    return rows;
  },
});

export const queueOpenEndedRegrade = mutation({
  args: {
    userAnswerId: v.id("userAnswers"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const userAnswer = await ctx.db.get(args.userAnswerId);
    if (!userAnswer) throw new Error("User answer not found");
    const matchQuestion = await ctx.db.get(userAnswer.matchQuestionId);
    if (!matchQuestion) throw new Error("Match question not found");
    const questionDoc = await ctx.db.get(matchQuestion.questionId);
    if (!questionDoc) throw new Error("Question not found");
    if ((questionDoc.questionType ?? "open_ended") !== "open_ended") {
      throw new Error("Only open-ended answers can be regraded");
    }
    const answerDoc = await ctx.db
      .query("answers")
      .withIndex("by_questionId", (q) => q.eq("questionId", matchQuestion.questionId))
      .unique();
    const expectedAnswer = answerDoc?.correctValue?.trim();
    if (!expectedAnswer) {
      throw new Error("No canonical answer available for regrade");
    }
    await ctx.db.patch(args.userAnswerId, {
      gradingStatus: "pending",
      gradingReason: "Manual regrade queued by admin.",
      updatedAt: Date.now(),
    });
    await ctx.scheduler.runAfter(0, internal.gameplay.gradeOpenEndedWithGeminiJob, {
      userAnswerId: args.userAnswerId,
      questionText: questionDoc.text,
      expectedAnswer,
      submittedAnswer: userAnswer.submittedAnswer,
      difficulty: questionDoc.difficulty,
      category: questionDoc.category,
      attempt: 0,
    });
    return { queued: true };
  },
});

export const getMatchState = query({
  args: {
    matchId: v.id("matches"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentQueryUserOptional(ctx);
    if (!user) return null;
    const match = await ctx.db.get(args.matchId);
    if (!match) throw new Error("Match not found");
    await assertParticipant(ctx, match, user._id);

    const state = await ctx.db
      .query("matchState")
      .withIndex("by_matchId", (q) => q.eq("matchId", args.matchId))
      .unique();

    return state;
  },
});

export const getCurrentQuestionForMatch = query({
  args: {
    matchId: v.id("matches"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentQueryUserOptional(ctx);
    if (!user) return null;
    const match = await ctx.db.get(args.matchId);
    if (!match) throw new Error("Match not found");
    await assertParticipant(ctx, match, user._id);

    const state = await ctx.db
      .query("matchState")
      .withIndex("by_matchId", (q) => q.eq("matchId", args.matchId))
      .unique();
    if (!state) return null;

    const link = await ctx.db
      .query("matchQuestions")
      .withIndex("by_match_order", (q) =>
        q.eq("matchId", args.matchId).eq("order", state.currentQuestion),
      )
      .unique();
    if (!link) return null;

    const question = await ctx.db.get(link.questionId);
    if (!question) return null;

    return {
      matchQuestionId: link._id,
      order: link.order,
      question: {
        _id: question._id,
        text: question.text,
        difficulty: question.difficulty,
        category: question.category,
        grade: question.grade,
        faculty: question.faculty,
        questionType: question.questionType ?? "open_ended",
        options: question.options ?? [],
      },
    };
  },
});

export const getMyAnswerForCurrentQuestion = query({
  args: {
    matchId: v.id("matches"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return {
        hasAnswered: false,
      };
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) {
      return {
        hasAnswered: false,
      };
    }

    const state = await ctx.db
      .query("matchState")
      .withIndex("by_matchId", (q) => q.eq("matchId", args.matchId))
      .unique();
    if (!state) return null;

    const link = await ctx.db
      .query("matchQuestions")
      .withIndex("by_match_order", (q) =>
        q.eq("matchId", args.matchId).eq("order", state.currentQuestion),
      )
      .unique();
    if (!link) return null;

    const existingSubmission = await ctx.db
      .query("userAnswers")
      .withIndex("by_user_matchQuestion", (q) =>
        q.eq("userId", user._id).eq("matchQuestionId", link._id),
      )
      .first();

    if (!existingSubmission) {
      return {
        hasAnswered: false,
      };
    }

    return {
      hasAnswered: true,
      isCorrect: existingSubmission.isCorrect,
      submittedAnswer: existingSubmission.submittedAnswer,
      responseTime: existingSubmission.responseTime,
      submittedAt: existingSubmission.submittedAt,
    };
  },
});

export const getAnswersCountForCurrentQuestion = query({
  args: {
    matchId: v.id("matches"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentQueryUserOptional(ctx);
    if (!user) {
      return { count: 0 };
    }
    const match = await ctx.db.get(args.matchId);
    if (!match) throw new Error("Match not found");
    await assertParticipant(ctx, match, user._id);

    const state = await ctx.db
      .query("matchState")
      .withIndex("by_matchId", (q) => q.eq("matchId", args.matchId))
      .unique();
    if (!state) {
      return { count: 0 };
    }

    const link = await ctx.db
      .query("matchQuestions")
      .withIndex("by_match_order", (q) =>
        q.eq("matchId", args.matchId).eq("order", state.currentQuestion),
      )
      .unique();
    if (!link) {
      return { count: 0 };
    }

    const answers = await ctx.db
      .query("userAnswers")
      .withIndex("by_matchQuestionId", (q) => q.eq("matchQuestionId", link._id))
      .collect();
    return { count: answers.length };
  },
});