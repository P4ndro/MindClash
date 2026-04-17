import { mutation, query, MutationCtx } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { v } from "convex/values";

type MatchDoc = Doc<"matches">;
type UserId = Id<"users">;

async function getCurrentUser(ctx: MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthorized");

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
    .unique();

  if (!user) throw new Error("User not found");
  return user;
}

async function assertParticipant(
  ctx: MutationCtx,
  match: MatchDoc,
  userId: UserId,
) {
  if (match.mode === "duel") {
    const isPlayer = match.player1Id === userId || match.player2Id === userId;
    if (!isPlayer) throw new Error("You are not a participant in this duel");
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
    throw new Error("You are not a participant in this team match");
  }
}

function normalizeAnswer(value: string) {
  return value.trim().toLowerCase();
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

  let player1Score = 0;
  let player2Score = 0;
  const userTeamCache = new Map<string, Id<"teams">[]>();

  for (const mq of matchQuestions) {
    const answersForQuestion = await ctx.db
      .query("userAnswers")
      .withIndex("by_matchQuestionId", (q) => q.eq("matchQuestionId", mq._id))
      .collect();

    for (const answer of answersForQuestion) {
      if (!answer.isCorrect) continue;

      if (match.mode === "duel") {
        if (match.player1Id && answer.userId === match.player1Id) player1Score += 1;
        if (match.player2Id && answer.userId === match.player2Id) player2Score += 1;
        continue;
      }

      const userIdKey = answer.userId.toString();
      let teamIds = userTeamCache.get(userIdKey);
      if (!teamIds) {
        const membership = await ctx.db
          .query("teamMembers")
          .withIndex("by_userId", (q) => q.eq("userId", answer.userId))
          .collect();
        teamIds = membership.map((m) => m.teamId);
        userTeamCache.set(userIdKey, teamIds ?? []);
      }
      const resolvedTeamIds = teamIds ?? [];

      if (match.team1Id && resolvedTeamIds.some((t) => t === match.team1Id)) player1Score += 1;
      if (match.team2Id && resolvedTeamIds.some((t) => t === match.team2Id)) player2Score += 1;
    }
  }

  let winnerUserId = undefined;
  if (match.mode === "duel" && player1Score !== player2Score) {
    winnerUserId = player1Score > player2Score ? match.player1Id : match.player2Id;
  }

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
    if (match.status !== "active") throw new Error("Match is not active");

    await assertParticipant(ctx, match, currentUser._id);

    const state = await ctx.db
      .query("matchState")
      .withIndex("by_matchId", (q) => q.eq("matchId", args.matchId))
      .unique();
    if (!state) throw new Error("Match state not found");
    if (state.phase !== "question") {
      throw new Error("Answers can only be submitted during question phase");
    }
    if (state.questionEndsAt && now > state.questionEndsAt) {
      throw new Error("Question deadline has passed");
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
      throw new Error("Answer already submitted for this question");
    }

    const answerDoc = await ctx.db
      .query("answers")
      .withIndex("by_questionId", (q) => q.eq("questionId", matchQuestion.questionId))
      .unique();
    if (!answerDoc) {
      throw new Error("Answer key not found for question");
    }

    const submitted = args.submittedAnswer.trim();
    if (!submitted) {
      throw new Error("submittedAnswer is required");
    }
    const isCorrect = normalizeAnswer(submitted) === normalizeAnswer(answerDoc.correctValue);

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
    if (match.status !== "active") throw new Error("Only active matches can advance");

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
    const deadlinePassed = Boolean(state.questionEndsAt && now > state.questionEndsAt);

    if (!deadlinePassed) {
      if (match.mode === "duel") {
        const hasPlayer1Answer = Boolean(
          match.player1Id && answersForCurrent.some((a) => a.userId === match.player1Id),
        );
        const hasPlayer2Answer = Boolean(
          match.player2Id && answersForCurrent.some((a) => a.userId === match.player2Id),
        );
        if (!hasPlayer1Answer || !hasPlayer2Answer) {
          throw new Error(
            "Cannot advance yet: waiting for both duel players to answer or timer expiry",
          );
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
          throw new Error(
            "Cannot advance yet: waiting for both teams to answer or timer expiry",
          );
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
      throw new Error("Only active matches can be finished");
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