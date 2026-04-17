import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const createQuestion = mutation({
  args: {
    text: v.string(),
    difficulty: v.union(v.literal("easy"), v.literal("medium"), v.literal("hard")),
    category: v.string(),
    correctValue: v.string(),
  },
  handler: async (ctx, args) => {
    const text = args.text.trim();
    const category = args.category.trim();
    const correctValue = args.correctValue.trim();

    if (!text) throw new Error("Question text is required");
    if (!category) throw new Error("Question category is required");
    if (!correctValue) throw new Error("Correct answer is required");

    const now = Date.now();
    const questionId = await ctx.db.insert("questions", {
      text,
      difficulty: args.difficulty,
      category,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("answers", {
      questionId,
      correctValue,
      createdAt: now,
      updatedAt: now,
    });

    return questionId;
  },
});

export const assignQuestionsToMatch = mutation({
  args: {
    matchId: v.id("matches"),
    questionIds: v.array(v.id("questions")),
  },
  handler: async (ctx, args) => {
    if (args.questionIds.length === 0) {
      throw new Error("At least one question is required");
    }

    const match = await ctx.db.get(args.matchId);
    if (!match) throw new Error("Match not found");

    if (match.status !== "waiting") {
      throw new Error("Questions can only be assigned while match is waiting");
    }

    const questionDocs = await Promise.all(
      args.questionIds.map((questionId) => ctx.db.get(questionId)),
    );
    if (questionDocs.some((doc) => doc === null)) {
      throw new Error("One or more questionIds are invalid");
    }

    const uniqueIds = new Set(args.questionIds.map((id) => id.toString()));
    if (uniqueIds.size !== args.questionIds.length) {
      throw new Error("Duplicate questionIds are not allowed");
    }

    const existing = await ctx.db
      .query("matchQuestions")
      .withIndex("by_matchId", (q) => q.eq("matchId", args.matchId))
      .collect();
    if (existing.length > 0) {
      throw new Error("Match already has assigned questions");
    }

    const now = Date.now();
    const insertedIds = [];
    for (let i = 0; i < args.questionIds.length; i += 1) {
      const inserted = await ctx.db.insert("matchQuestions", {
        matchId: args.matchId,
        questionId: args.questionIds[i],
        order: i,
        createdAt: now,
        updatedAt: now,
      });
      insertedIds.push(inserted);
    }

    return insertedIds;
  },
});

export const getQuestionsForMatch = query({
  args: {
    matchId: v.id("matches"),
  },
  handler: async (ctx, args) => {
    const links = await ctx.db
      .query("matchQuestions")
      .withIndex("by_match_order", (q) => q.eq("matchId", args.matchId))
      .collect();

    const hydrated = await Promise.all(
      links.map(async (link) => {
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
          },
        };
      }),
    );

    return hydrated.filter((item) => item !== null);
  },
});

export const getQuestionById = query({
  args: {
    questionId: v.id("questions"),
  },
  handler: async (ctx, args) => {
    const question = await ctx.db.get(args.questionId);
    if (!question) throw new Error("Question not found");
    return question;
  },
});