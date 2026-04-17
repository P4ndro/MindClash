import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    username: v.string(),
    email: v.string(),
    rating: v.number(),
    createdAt: v.number(),
  })
    .index("by_clerkId", ["clerkId"])
    .index("by_email", ["email"])
    .index("by_username", ["username"])
    .index("by_rating", ["rating"])
    .index("by_createdAt", ["createdAt"]),

  teams: defineTable({
    name: v.string(),
  }),

  teamMembers: defineTable({
    userId: v.id("users"),
    teamId: v.id("teams"),
  })
    .index("by_userId", ["userId"])
    .index("by_teamId", ["teamId"])
    .index("by_team_user", ["teamId", "userId"]),

  matches: defineTable({
    player1Id: v.optional(v.id("users")),
    player2Id: v.optional(v.id("users")),
    team1Id: v.optional(v.id("teams")),
    team2Id: v.optional(v.id("teams")),
    status: v.string(),
    startedAt: v.optional(v.number()),
    endedAt: v.optional(v.number()),
  })
    .index("by_status", ["status"])
    .index("by_player1", ["player1Id"])
    .index("by_player2", ["player2Id"])
    .index("by_team1", ["team1Id"])
    .index("by_team2", ["team2Id"])
    .index("by_startedAt", ["startedAt"]),

  matchResults: defineTable({
    matchId: v.id("matches"),
    player1Score: v.number(),
    player2Score: v.number(),
  }).index("by_matchId", ["matchId"]),

  matchState: defineTable({
    matchId: v.id("matches"),
    currentQuestion: v.number(),
    timeRemaining: v.number(),
    stateData: v.string(),
  }).index("by_matchId", ["matchId"]),

  questions: defineTable({
    text: v.string(),
    difficulty: v.string(),
    category: v.string(),
    createdAt: v.number(),
  })
    .index("by_category", ["category"])
    .index("by_difficulty", ["difficulty"])
    .index("by_createdAt", ["createdAt"])
    .index("by_category_difficulty", ["category", "difficulty"]),

  answers: defineTable({
    questionId: v.id("questions"),
    correctValue: v.string(),
  }).index("by_questionId", ["questionId"]),

  matchQuestions: defineTable({
    matchId: v.id("matches"),
    questionId: v.id("questions"),
    order: v.number(),
  })
    .index("by_matchId", ["matchId"])
    .index("by_questionId", ["questionId"])
    .index("by_match_order", ["matchId", "order"]),

  userAnswers: defineTable({
    userId: v.id("users"),
    matchQuestionId: v.id("matchQuestions"),
    submittedAnswer: v.string(),
    isCorrect: v.boolean(),
    responseTime: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_matchQuestionId", ["matchQuestionId"])
    .index("by_user_matchQuestion", ["userId", "matchQuestionId"]),

  tournaments: defineTable({
    name: v.string(),
    type: v.string(),
    status: v.string(),
    createdAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_type", ["type"])
    .index("by_createdAt", ["createdAt"]),

  tournamentParticipants: defineTable({
    userId: v.id("users"),
    tournamentId: v.id("tournaments"),
    joinedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_tournamentId", ["tournamentId"])
    .index("by_tournament_user", ["tournamentId", "userId"]),

  tournamentMatches: defineTable({
    tournamentId: v.id("tournaments"),
    matchId: v.id("matches"),
    roundNumber: v.number(),
  })
    .index("by_tournamentId", ["tournamentId"])
    .index("by_matchId", ["matchId"])
    .index("by_tournament_round", ["tournamentId", "roundNumber"]),

  notifications: defineTable({
    userId: v.id("users"),
    type: v.string(),
    isRead: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_user_read", ["userId", "isRead"])
    .index("by_user_createdAt", ["userId", "createdAt"]),
});
