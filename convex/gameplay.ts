import { mutation, query, MutationCtx } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { computeMatchScores, QuestionAnswers } from "./gameplayScoring";

type MatchDoc = Doc<"matches">;
type UserId = Id<"users">;

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
  ctx: MutationCtx,
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

function normalizeAnswer(value: string) {
  return value.trim().toLowerCase();
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

  for (const mq of matchQuestions) {
    const answersForQuestion = await ctx.db
      .query("userAnswers")
      .withIndex("by_matchQuestionId", (q) => q.eq("matchQuestionId", mq._id))
      .collect();

    scoringQuestions.push({
      matchQuestionId: mq._id.toString(),
      answers: answersForQuestion.map((a) => ({
        userId: a.userId.toString(),
          isCorrect: a.isCorrect === true,
      })),
    });

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
    if (questionType === "msq") {
      const answerDoc = await ctx.db
        .query("answers")
        .withIndex("by_questionId", (q) => q.eq("questionId", matchQuestion.questionId))
        .unique();
      if (!answerDoc?.correctValue) {
        throw new Error("Answer key not found for MSQ question");
      }
      isCorrect = normalizeAnswer(submitted) === normalizeAnswer(answerDoc.correctValue);
    }

    const userAnswerId = await ctx.db.insert("userAnswers", {
      userId: currentUser._id,
      matchQuestionId: args.matchQuestionId,
      submittedAnswer: submitted,
      isCorrect,
      responseTime: args.responseTime,
      submittedAt: now,
      createdAt: now,
      updatedAt: now,
    });

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
    const questionDurationMs = 30_000;

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
    const match = await ctx.db.get(args.matchId);
    if (!match) throw new Error("Match not found");

    const result = await ctx.db
      .query("matchResults")
      .withIndex("by_matchId", (q) => q.eq("matchId", args.matchId))
      .unique();

    return { match, result };
  },
});

export const getMatchState = query({
  args: {
    matchId: v.id("matches"),
  },
  handler: async (ctx, args) => {
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
    const match = await ctx.db.get(args.matchId);
    if (!match) throw new Error("Match not found");

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