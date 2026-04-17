import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const createMatch = mutation({
  args: {
    mode: v.union(v.literal("duel"), v.literal("team")),
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
    return args.matchId;
  },
});

export const getMatchById = query({
  args: { matchId: v.id("matches") },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) throw new Error("Match not found");
    return match;
  },
});

export const getWaitingMatchesByMode = query({
  args: {
    mode: v.union(v.literal("duel"), v.literal("team")),
  },
  handler: async (ctx, args) => {
    const waiting = await ctx.db
      .query("matches")
      .withIndex("by_status", (q) => q.eq("status", "waiting"))
      .collect();

    return waiting.filter((m) => m.mode === args.mode);
  },
});