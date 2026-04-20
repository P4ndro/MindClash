import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  topics: defineTable({
    name: v.string(),
    slug: v.string(),
    grade: v.optional(v.union(v.literal("middle"), v.literal("high"), v.literal("college"))),
    faculty: v.optional(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_name", ["name"])
    .index("by_isActive", ["isActive"])
    .index("by_grade_faculty", ["grade", "faculty"]),

  users: defineTable({
    clerkId: v.string(),
    username: v.string(),
    email: v.string(),
    rating: v.number(),
    role: v.optional(v.union(v.literal("admin"), v.literal("user"))),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_clerkId", ["clerkId"])
    .index("by_email", ["email"])
    .index("by_username", ["username"])
    .index("by_rating", ["rating"])
    .index("by_createdAt", ["createdAt"])
    .index("by_role", ["role"]),

  userCourseRatings: defineTable({
    userId: v.id("users"),
    course: v.string(),
    rating: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_course", ["course"])
    .index("by_user_course", ["userId", "course"]),

  teams: defineTable({
    name: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_createdAt", ["createdAt"]),

  teamMembers: defineTable({
    userId: v.id("users"),
    teamId: v.id("teams"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_teamId", ["teamId"])
    .index("by_team_user", ["teamId", "userId"]),

  matches: defineTable({
    mode: v.union(v.literal("duel"), v.literal("team")),
    topic: v.optional(v.string()),
    grade: v.optional(v.union(v.literal("middle"), v.literal("high"), v.literal("college"))),
    faculty: v.optional(v.string()),
    player1Id: v.optional(v.id("users")),
    player2Id: v.optional(v.id("users")),
    team1Id: v.optional(v.id("teams")),
    team2Id: v.optional(v.id("teams")),
    winnerUserId: v.optional(v.id("users")),
    status: v.union(
      v.literal("waiting"),
      v.literal("active"),
      v.literal("finished"),
      v.literal("cancelled"),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
    startedAt: v.optional(v.number()),
    endedAt: v.optional(v.number()),
  })
    .index("by_mode", ["mode"])
    .index("by_status", ["status"])
    .index("by_player1", ["player1Id"])
    .index("by_player2", ["player2Id"])
    .index("by_team1", ["team1Id"])
    .index("by_team2", ["team2Id"])
    .index("by_startedAt", ["startedAt"])
    .index("by_mode_status_topic_grade_faculty", ["mode", "status", "topic", "grade", "faculty"]),

  matchResults: defineTable({
    matchId: v.id("matches"),
    player1Score: v.number(),
    player2Score: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_matchId", ["matchId"]),

  matchState: defineTable({
    matchId: v.id("matches"),
    currentQuestion: v.number(),
    timeRemaining: v.number(),
    phase: v.union(
      v.literal("lobby"),
      v.literal("countdown"),
      v.literal("question"),
      v.literal("review"),
      v.literal("finished"),
    ),
    questionStartedAt: v.optional(v.number()),
    questionEndsAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_matchId", ["matchId"]),

  questions: defineTable({
    text: v.string(),
    difficulty: v.union(v.literal("easy"), v.literal("medium"), v.literal("hard")),
    category: v.string(),
    grade: v.union(v.literal("middle"), v.literal("high"), v.literal("college")),
    faculty: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_category", ["category"])
    .index("by_difficulty", ["difficulty"])
    .index("by_createdAt", ["createdAt"])
    .index("by_category_difficulty", ["category", "difficulty"])
    .index("by_category_grade", ["category", "grade"])
    .index("by_category_grade_faculty", ["category", "grade", "faculty"]),

  answers: defineTable({
    questionId: v.id("questions"),
    correctValue: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_questionId", ["questionId"]),

  matchQuestions: defineTable({
    matchId: v.id("matches"),
    questionId: v.id("questions"),
    order: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
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
    submittedAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_matchQuestionId", ["matchQuestionId"])
    .index("by_user_matchQuestion", ["userId", "matchQuestionId"]),

  tournaments: defineTable({
    name: v.string(),
    type: v.union(v.literal("single_elimination"), v.literal("round_robin")),
    status: v.union(
      v.literal("draft"),
      v.literal("registration_open"),
      v.literal("active"),
      v.literal("finished"),
      v.literal("cancelled"),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_type", ["type"])
    .index("by_createdAt", ["createdAt"]),

  tournamentParticipants: defineTable({
    userId: v.id("users"),
    tournamentId: v.id("tournaments"),
    joinedAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_tournamentId", ["tournamentId"])
    .index("by_tournament_user", ["tournamentId", "userId"]),

  tournamentMatches: defineTable({
    tournamentId: v.id("tournaments"),
    matchId: v.id("matches"),
    roundNumber: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_tournamentId", ["tournamentId"])
    .index("by_matchId", ["matchId"])
    .index("by_tournament_round", ["tournamentId", "roundNumber"]),

  notifications: defineTable({
    userId: v.id("users"),
    type: v.union(
      v.literal("match_found"),
      v.literal("match_invite"),
      v.literal("tournament_start"),
      v.literal("system"),
    ),
    isRead: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_user_read", ["userId", "isRead"])
    .index("by_user_createdAt", ["userId", "createdAt"]),
});




