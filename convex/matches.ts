import { mutation, query, MutationCtx, QueryCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { resolveCurrentUser } from "./auth";

const STALE_WAITING_MATCH_MS = 5 * 60 * 1000;

type MatchCtx = MutationCtx | QueryCtx;

function getQuestionDurationMsByDifficulty(difficulty: "easy" | "medium" | "hard") {
  if (difficulty === "hard") return 60_000;
  if (difficulty === "medium") return 45_000;
  return 30_000;
}

async function getInitialQuestionDurationMs(ctx: MutationCtx, matchId: Id<"matches">) {
  const firstLink = await ctx.db
    .query("matchQuestions")
    .withIndex("by_match_order", (q) => q.eq("matchId", matchId).eq("order", 0))
    .unique();
  if (!firstLink) return 30_000;
  const firstQuestion = await ctx.db.get(firstLink.questionId);
  if (!firstQuestion) return 30_000;
  return getQuestionDurationMsByDifficulty(firstQuestion.difficulty);
}

async function assertDuelParticipant(ctx: MatchCtx, matchId: Id<"matches">, userId: Id<"users">) {
  const match = await ctx.db.get(matchId);
  if (!match) throw new Error("Match not found");
  if (match.mode !== "duel") return match;
  const isPlayer = match.player1Id === userId || match.player2Id === userId;
  if (!isPlayer) {
    throw new Error("forbidden_participant: You are not a participant in this duel");
  }
  return match;
}

async function cleanupStaleWaitingMatchesInternal(
  ctx: MutationCtx,
  args: {
    mode: "duel" | "team";
    topic?: string;
    grade?: "middle" | "high" | "college";
    faculty?: string;
  },
) {
  const now = Date.now();
  const waiting = await ctx.db
    .query("matches")
    .withIndex("by_status", (q) => q.eq("status", "waiting"))
    .collect();

  const normalizedTopic = args.topic?.trim();
  const normalizedFaculty = args.faculty?.trim();
  let cancelledCount = 0;

  for (const match of waiting) {
    if (match.mode !== args.mode) continue;
    if (normalizedTopic && (match.topic ?? undefined) !== normalizedTopic) continue;
    if (args.grade && (match.grade ?? undefined) !== args.grade) continue;
    if (normalizedFaculty && (match.faculty ?? undefined) !== normalizedFaculty) continue;
    if (now - match.createdAt <= STALE_WAITING_MATCH_MS) continue;

    await ctx.db.patch(match._id, {
      status: "cancelled",
      endedAt: now,
      updatedAt: now,
    });
    cancelledCount += 1;
  }

  return { cancelledCount };
}

export const createMatch = mutation({
  args: {
    mode: v.union(v.literal("duel"), v.literal("team")),
    topic: v.optional(v.string()),
    grade: v.optional(v.union(v.literal("middle"), v.literal("high"), v.literal("college"))),
    faculty: v.optional(v.string()),
    player1Id: v.optional(v.id("users")),
    team1Id: v.optional(v.id("teams")),
  },
  handler: async (ctx, args) => {
    if (args.mode === "duel" && !args.player1Id) {
      throw new Error("player1Id is required for duel mode");
    }
    if (args.mode === "team" && !args.team1Id) {
      throw new Error("team1Id is required for team mode");
    }

    const now = Date.now();
    return await ctx.db.insert("matches", {
      mode: args.mode,
      topic: args.topic?.trim() || undefined,
      grade: args.grade,
      faculty: args.faculty?.trim() || undefined,
      player1Id: args.mode === "duel" ? args.player1Id : undefined,
      player2Id: undefined,
      team1Id: args.mode === "team" ? args.team1Id : undefined,
      team2Id: undefined,
      winnerUserId: undefined,
      status: "waiting",
      createdAt: now,
      updatedAt: now,
      startedAt: undefined,
      endedAt: undefined,
    });
  },
});

export const joinMatch = mutation({
  args: {
    matchId: v.id("matches"),
    player2Id: v.optional(v.id("users")),
    team2Id: v.optional(v.id("teams")),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) throw new Error("Match not found");
    if (match.status !== "waiting") {
      throw new Error("Only waiting matches can be joined");
    }

    const now = Date.now();
    const questionDurationMs = await getInitialQuestionDurationMs(ctx, args.matchId);

    if (match.mode === "duel") {
      if (!args.player2Id) {
        throw new Error("player2Id is required to join a duel");
      }
      if (!match.player1Id) {
        throw new Error("Invalid duel match: missing player1");
      }
      if (match.player1Id === args.player2Id) {
        throw new Error("player2Id must be different from player1Id");
      }
      await ctx.db.patch(args.matchId, {
        player2Id: args.player2Id,
        status: "active",
        startedAt: now,
        updatedAt: now,
      });

      const existingState = await ctx.db
        .query("matchState")
        .withIndex("by_matchId", (q) => q.eq("matchId", args.matchId))
        .unique();
      if (!existingState) {
        await ctx.db.insert("matchState", {
          matchId: args.matchId,
          currentQuestion: 0,
          timeRemaining: questionDurationMs,
          phase: "question",
          questionStartedAt: now,
          questionEndsAt: now + questionDurationMs,
          createdAt: now,
          updatedAt: now,
        });
      }
      return args.matchId;
    }

    if (!args.team2Id) {
      throw new Error("team2Id is required to join a team match");
    }
    if (!match.team1Id) {
      throw new Error("Invalid team match: missing team1");
    }
    if (match.team1Id === args.team2Id) {
      throw new Error("team2Id must be different from team1Id");
    }
    await ctx.db.patch(args.matchId, {
      team2Id: args.team2Id,
      status: "active",
      startedAt: now,
      updatedAt: now,
    });

    const existingState = await ctx.db
      .query("matchState")
      .withIndex("by_matchId", (q) => q.eq("matchId", args.matchId))
      .unique();
    if (!existingState) {
      await ctx.db.insert("matchState", {
        matchId: args.matchId,
        currentQuestion: 0,
        timeRemaining: questionDurationMs,
        phase: "question",
        questionStartedAt: now,
        questionEndsAt: now + questionDurationMs,
        createdAt: now,
        updatedAt: now,
      });
    }
    return args.matchId;
  },
});

export const getMatchById = query({
  args: { matchId: v.id("matches") },
  handler: async (ctx, args) => {
    const resolved = await resolveCurrentUser(ctx);
    if (!resolved?.user) {
      return null;
    }
    return await assertDuelParticipant(ctx, args.matchId, resolved.user._id);
  },
});

export const getWaitingMatchesByMode = query({
  args: {
    mode: v.union(v.literal("duel"), v.literal("team")),
    topic: v.optional(v.string()),
    grade: v.optional(v.union(v.literal("middle"), v.literal("high"), v.literal("college"))),
    faculty: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const waiting = await ctx.db
      .query("matches")
      .withIndex("by_status", (q) => q.eq("status", "waiting"))
      .collect();

    const normalizedTopic = args.topic?.trim();
    const normalizedFaculty = args.faculty?.trim();
    return waiting.filter((m) => {
      if (m.mode !== args.mode) return false;
      if (normalizedTopic && m.topic !== normalizedTopic) return false;
      if (args.grade && m.grade !== args.grade) return false;
      if (normalizedFaculty && m.faculty !== normalizedFaculty) return false;
      return true;
    });
  },
});

export const findOrCreateDuelMatch = mutation({
  args: {
    playerId: v.id("users"),
    topic: v.optional(v.string()),
    grade: v.optional(v.union(v.literal("middle"), v.literal("high"), v.literal("college"))),
    faculty: v.optional(v.string()),
    questionIds: v.array(v.id("questions")),
  },
  handler: async (ctx, args) => {
    const resolved = await resolveCurrentUser(ctx);
    if (!resolved?.user) {
      throw new Error("unauthenticated: You must be signed in to start matchmaking");
    }
    const authenticatedPlayerId = resolved.user._id;
    if (args.playerId !== authenticatedPlayerId) {
      throw new Error("forbidden_participant: Matchmaking identity mismatch");
    }

    if (args.questionIds.length === 0) {
      throw new Error("At least one question is required");
    }
    if (args.questionIds.length > 10) {
      throw new Error("validation_error: A match can have at most 10 questions");
    }

    await cleanupStaleWaitingMatchesInternal(ctx, {
      mode: "duel",
      topic: args.topic,
      grade: args.grade,
      faculty: args.faculty,
    });

    const questionDocs = await Promise.all(args.questionIds.map((questionId) => ctx.db.get(questionId)));
    if (questionDocs.some((doc) => doc === null)) {
      throw new Error("validation_error: One or more questionIds are invalid");
    }

    const now = Date.now();
    const normalizedTopic = args.topic?.trim() || undefined;
    const normalizedFaculty = args.faculty?.trim() || undefined;

    const waiting = await ctx.db
      .query("matches")
      .withIndex("by_status", (q) => q.eq("status", "waiting"))
      .collect();

    const myWaiting = waiting
      .filter((match) => {
        if (match.mode !== "duel") return false;
        if (match.player1Id !== authenticatedPlayerId) return false;
        if (match.player2Id) return false;
        if ((match.topic ?? undefined) !== normalizedTopic) return false;
        if ((match.grade ?? undefined) !== (args.grade ?? undefined)) return false;
        if ((match.faculty ?? undefined) !== normalizedFaculty) return false;
        return true;
      })
      .sort((a, b) => b.createdAt - a.createdAt)[0];

    if (myWaiting) {
      return {
        matchId: myWaiting._id,
        joinedExisting: false,
      };
    }

    const joinable = waiting
      .filter((match) => {
        if (match.mode !== "duel") return false;
        if (!match.player1Id || match.player1Id === authenticatedPlayerId) return false;
        if (match.player2Id) return false;
        if ((match.topic ?? undefined) !== normalizedTopic) return false;
        if ((match.grade ?? undefined) !== (args.grade ?? undefined)) return false;
        if ((match.faculty ?? undefined) !== normalizedFaculty) return false;
        return true;
      })
      .sort((a, b) => b.createdAt - a.createdAt)[0];

    if (joinable) {
      const questionDurationMs = await getInitialQuestionDurationMs(ctx, joinable._id);
      await ctx.db.patch(joinable._id, {
        player2Id: authenticatedPlayerId,
        status: "active",
        startedAt: now,
        updatedAt: now,
      });

      const existingState = await ctx.db
        .query("matchState")
        .withIndex("by_matchId", (q) => q.eq("matchId", joinable._id))
        .unique();
      if (!existingState) {
        await ctx.db.insert("matchState", {
          matchId: joinable._id,
          currentQuestion: 0,
          timeRemaining: questionDurationMs,
          phase: "question",
          questionStartedAt: now,
          questionEndsAt: now + questionDurationMs,
          createdAt: now,
          updatedAt: now,
        });
      }

      return {
        matchId: joinable._id,
        joinedExisting: true,
      };
    }

    const newMatchId = await ctx.db.insert("matches", {
      mode: "duel",
      topic: normalizedTopic,
      grade: args.grade,
      faculty: normalizedFaculty,
      player1Id: authenticatedPlayerId,
      player2Id: undefined,
      team1Id: undefined,
      team2Id: undefined,
      winnerUserId: undefined,
      status: "waiting",
      createdAt: now,
      updatedAt: now,
      startedAt: undefined,
      endedAt: undefined,
    });

    for (let i = 0; i < args.questionIds.length; i += 1) {
      await ctx.db.insert("matchQuestions", {
        matchId: newMatchId,
        questionId: args.questionIds[i],
        order: i,
        createdAt: now,
        updatedAt: now,
      });
    }

    return {
      matchId: newMatchId,
      joinedExisting: false,
    };
  },
});

export const cleanupStaleWaitingMatches = mutation({
  args: {
    mode: v.union(v.literal("duel"), v.literal("team")),
    topic: v.optional(v.string()),
    grade: v.optional(v.union(v.literal("middle"), v.literal("high"), v.literal("college"))),
    faculty: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await cleanupStaleWaitingMatchesInternal(ctx, args);
  },
});