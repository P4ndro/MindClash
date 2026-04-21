import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./auth";

const collegeFaculties = ["Management", "Computer Science", "Law"];
const seededCollegeQuestions: Array<{
  category: string;
  faculty: string;
  text: string;
  correctValue?: string;
  difficulty: "easy" | "medium" | "hard";
  questionType: "open_ended" | "msq";
  options?: string[];
}> = [
  {
    faculty: "Computer Science",
    category: "Databases",
    text: "Which SQL keyword is used to retrieve data from a table?",
    correctValue: "SELECT",
    difficulty: "easy",
    questionType: "msq",
    options: ["SELECT", "PICK", "GET", "FETCHROW"],
  },
  {
    faculty: "Computer Science",
    category: "Object-Oriented Programming (Java)",
    text: "Which Java keyword is used to inherit from a class?",
    correctValue: "extends",
    difficulty: "easy",
    questionType: "msq",
    options: ["extends", "inherits", "implements", "super"],
  },
  {
    faculty: "Computer Science",
    category: "Theory of Computation",
    text: "What machine model is commonly used to define decidability?",
    difficulty: "medium",
    questionType: "open_ended",
  },
  {
    faculty: "Computer Science",
    category: "Theory of Computation",
    text: "Name one closure property of regular languages.",
    difficulty: "medium",
    questionType: "open_ended",
  },
  {
    faculty: "Computer Science",
    category: "Data Structures and Algorithms",
    text: "What is the average time complexity of binary search on a sorted array?",
    correctValue: "O(log n)",
    difficulty: "medium",
    questionType: "msq",
    options: ["O(log n)", "O(n)", "O(n log n)", "O(1)"],
  },
  {
    faculty: "Computer Science",
    category: "Computer Networks",
    text: "Which protocol is used for secure web traffic?",
    correctValue: "HTTPS",
    difficulty: "easy",
    questionType: "msq",
    options: ["HTTPS", "HTTP", "FTP", "SMTP"],
  },
  {
    faculty: "Computer Science",
    category: "Databases",
    text: "Which SQL clause is used to filter rows?",
    correctValue: "WHERE",
    difficulty: "easy",
    questionType: "msq",
    options: ["WHERE", "ORDER BY", "GROUP BY", "LIMIT"],
  },
  {
    faculty: "Computer Science",
    category: "Databases",
    text: "Which SQL operation combines rows from two tables based on related columns?",
    correctValue: "JOIN",
    difficulty: "medium",
    questionType: "msq",
    options: ["JOIN", "UNION", "MERGE", "COMBINE"],
  },
  {
    faculty: "Computer Science",
    category: "Object-Oriented Programming (Java)",
    text: "Which Java keyword prevents a class from being inherited?",
    correctValue: "final",
    difficulty: "medium",
    questionType: "msq",
    options: ["final", "static", "private", "sealed"],
  },
  {
    faculty: "Computer Science",
    category: "Object-Oriented Programming (Java)",
    text: "What is the entry-point method name in a Java application?",
    correctValue: "main",
    difficulty: "easy",
    questionType: "msq",
    options: ["main", "start", "run", "init"],
  },
  {
    faculty: "Computer Science",
    category: "Theory of Computation",
    text: "What does DFA stand for?",
    correctValue: "Deterministic Finite Automaton",
    difficulty: "medium",
    questionType: "msq",
    options: [
      "Deterministic Finite Automaton",
      "Dynamic Formal Algorithm",
      "Directed Finite Analysis",
      "Deterministic Functional Array",
    ],
  },
  {
    faculty: "Computer Science",
    category: "Theory of Computation",
    text: "What is the common notation for the empty string?",
    difficulty: "hard",
    questionType: "open_ended",
  },
  {
    faculty: "Computer Science",
    category: "Data Structures and Algorithms",
    text: "What data structure uses FIFO order?",
    correctValue: "Queue",
    difficulty: "easy",
    questionType: "msq",
    options: ["Queue", "Stack", "Heap", "Tree"],
  },
  {
    faculty: "Computer Science",
    category: "Data Structures and Algorithms",
    text: "What is the worst-case time complexity of linear search?",
    correctValue: "O(n)",
    difficulty: "easy",
    questionType: "msq",
    options: ["O(n)", "O(log n)", "O(1)", "O(n log n)"],
  },
  {
    faculty: "Computer Science",
    category: "Computer Networks",
    text: "Which layer of the OSI model is responsible for routing?",
    correctValue: "Network layer",
    difficulty: "medium",
    questionType: "msq",
    options: ["Network layer", "Application layer", "Session layer", "Physical layer"],
  },
  {
    faculty: "Computer Science",
    category: "Computer Networks",
    text: "What does TCP stand for?",
    difficulty: "medium",
    questionType: "open_ended",
  },
  {
    faculty: "Management",
    category: "Principles of Management",
    text: "Which management function includes setting objectives?",
    correctValue: "Planning",
    difficulty: "easy",
    questionType: "msq",
    options: ["Planning", "Controlling", "Staffing", "Leading"],
  },
  {
    faculty: "Management",
    category: "Marketing Management",
    text: "What does the 'P' stand for in the 4Ps marketing mix besides Price, Place, and Promotion?",
    correctValue: "Product",
    difficulty: "easy",
    questionType: "msq",
    options: ["Product", "People", "Process", "Positioning"],
  },
  {
    faculty: "Management",
    category: "Financial Accounting",
    text: "Which statement reports a company's assets, liabilities, and equity?",
    correctValue: "Balance sheet",
    difficulty: "medium",
    questionType: "msq",
    options: ["Balance sheet", "Income statement", "Cash flow statement", "Equity statement"],
  },
  {
    faculty: "Management",
    category: "Principles of Management",
    text: "Which management function focuses on evaluating performance?",
    correctValue: "Controlling",
    difficulty: "easy",
    questionType: "msq",
    options: ["Controlling", "Planning", "Organizing", "Leading"],
  },
  {
    faculty: "Management",
    category: "Principles of Management",
    text: "Which leadership style typically involves shared decision-making?",
    difficulty: "medium",
    questionType: "open_ended",
  },
  {
    faculty: "Management",
    category: "Marketing Management",
    text: "What does SWOT stand for in strategic analysis?",
    difficulty: "medium",
    questionType: "open_ended",
  },
  {
    faculty: "Management",
    category: "Marketing Management",
    text: "Which pricing strategy sets a high initial price before lowering it over time?",
    correctValue: "Price skimming",
    difficulty: "hard",
    questionType: "msq",
    options: ["Price skimming", "Penetration pricing", "Bundle pricing", "Loss leader pricing"],
  },
  {
    faculty: "Management",
    category: "Financial Accounting",
    text: "Which financial statement summarizes revenues and expenses over a period?",
    correctValue: "Income statement",
    difficulty: "easy",
    questionType: "msq",
    options: ["Income statement", "Balance sheet", "Trial balance", "General ledger"],
  },
  {
    faculty: "Management",
    category: "Financial Accounting",
    text: "What accounting principle requires expenses to be recorded in the same period as related revenues?",
    difficulty: "hard",
    questionType: "open_ended",
  },
  {
    faculty: "Law",
    category: "Constitutional Law",
    text: "What is the primary purpose of a constitution?",
    difficulty: "medium",
    questionType: "open_ended",
  },
  {
    faculty: "Law",
    category: "Criminal Law",
    text: "In criminal law, what is the term for the guilty act?",
    correctValue: "Actus reus",
    difficulty: "hard",
    questionType: "msq",
    options: ["Actus reus", "Mens rea", "Habeas corpus", "Stare decisis"],
  },
  {
    faculty: "Law",
    category: "Data Protection and IT Law",
    text: "Which regulation is a major EU framework for personal data protection?",
    correctValue: "GDPR",
    difficulty: "easy",
    questionType: "msq",
    options: ["GDPR", "HIPAA", "SOX", "COPPA"],
  },
  {
    faculty: "Law",
    category: "Constitutional Law",
    text: "What principle means no one is above the law?",
    correctValue: "Rule of law",
    difficulty: "easy",
    questionType: "msq",
    options: ["Rule of law", "Judicial review", "Federalism", "Sovereignty"],
  },
  {
    faculty: "Law",
    category: "Constitutional Law",
    text: "What term describes the division of power among branches of government?",
    correctValue: "Separation of powers",
    difficulty: "medium",
    questionType: "msq",
    options: ["Separation of powers", "Judicial activism", "Due process", "Natural justice"],
  },
  {
    faculty: "Law",
    category: "Criminal Law",
    text: "What is the mental element of a crime commonly called?",
    difficulty: "hard",
    questionType: "open_ended",
  },
  {
    faculty: "Law",
    category: "Criminal Law",
    text: "What is the standard burden of proof in criminal cases?",
    difficulty: "medium",
    questionType: "open_ended",
  },
  {
    faculty: "Law",
    category: "Data Protection and IT Law",
    text: "Under GDPR, what does DPIA stand for?",
    difficulty: "hard",
    questionType: "open_ended",
  },
  {
    faculty: "Law",
    category: "Data Protection and IT Law",
    text: "Which GDPR principle requires collecting only necessary personal data?",
    correctValue: "Data minimization",
    difficulty: "medium",
    questionType: "msq",
    options: ["Data minimization", "Storage inflation", "Purpose drift", "Data permanence"],
  },
];

export const createQuestion = mutation({
  args: {
    text: v.string(),
    difficulty: v.union(v.literal("easy"), v.literal("medium"), v.literal("hard")),
    category: v.string(),
    grade: v.union(v.literal("middle"), v.literal("high"), v.literal("college")),
    faculty: v.optional(v.string()),
    questionType: v.union(v.literal("open_ended"), v.literal("msq")),
    options: v.optional(v.array(v.string())),
    correctValue: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const text = args.text.trim();
    const category = args.category.trim();
    const correctValue = args.correctValue?.trim();

    if (!text) throw new Error("Question text is required");
    if (!category) throw new Error("Question category is required");
    if (args.questionType === "msq") {
      if (!args.options || args.options.length < 2) {
        throw new Error("MSQ questions require at least 2 options");
      }
      const normalizedOptions = args.options.map((option) => option.trim()).filter(Boolean);
      if (normalizedOptions.length < 2) {
        throw new Error("MSQ questions require at least 2 non-empty options");
      }
      if (!correctValue) {
        throw new Error("MSQ questions require a correct answer");
      }
      if (!normalizedOptions.some((option) => option.toLowerCase() === correctValue.toLowerCase())) {
        throw new Error("MSQ correct answer must exist in options");
      }
    }

    const now = Date.now();
    const questionId = await ctx.db.insert("questions", {
      text,
      difficulty: args.difficulty,
      category,
      grade: args.grade,
      faculty: args.faculty?.trim() || undefined,
      questionType: args.questionType,
      options: args.questionType === "msq" ? args.options?.map((option) => option.trim()).filter(Boolean) : undefined,
      createdAt: now,
      updatedAt: now,
    });

    if (args.questionType === "msq") {
      await ctx.db.insert("answers", {
        questionId,
        correctValue,
        createdAt: now,
        updatedAt: now,
      });
    }

    return questionId;
  },
});

export const seedCollegeFacultyQuestions = mutation({
  handler: async (ctx) => {
    const now = Date.now();
    const inserted: string[] = [];

    for (const item of seededCollegeQuestions) {
      const existing = await ctx.db
        .query("questions")
        .withIndex("by_category_grade", (q) => q.eq("category", item.category).eq("grade", "college"))
        .collect();
      const sameQuestion = existing.find((q) => q.text.trim() === item.text.trim() && (q.faculty ?? "") === item.faculty);
      if (sameQuestion) continue;

      const questionId = await ctx.db.insert("questions", {
        text: item.text,
        difficulty: item.difficulty,
        category: item.category,
        grade: "college",
        faculty: item.faculty,
        questionType: item.questionType,
        options: item.questionType === "msq" ? item.options : undefined,
        createdAt: now,
        updatedAt: now,
      });

      if (item.questionType === "msq" && item.correctValue) {
        await ctx.db.insert("answers", {
          questionId,
          correctValue: item.correctValue,
          createdAt: now,
          updatedAt: now,
        });
      }

      inserted.push(`${item.faculty} :: ${item.category}`);
    }

    return {
      insertedCount: inserted.length,
      inserted,
    };
  },
});

export const assignQuestionsToMatch = mutation({
  args: {
    matchId: v.id("matches"),
    questionIds: v.array(v.id("questions")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    if (args.questionIds.length === 0) {
      throw new Error("At least one question is required");
    }
    if (args.questionIds.length > 10) {
      throw new Error("At most 10 questions can be assigned to a match");
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
            grade: question.grade,
            faculty: question.faculty,
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

export const getQuestionsForQuickPlay = query({
  args: {
    category: v.optional(v.string()),
    grade: v.optional(v.union(v.literal("middle"), v.literal("high"), v.literal("college"))),
    faculty: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.max(1, Math.min(10, Math.floor(args.limit ?? 10)));
    const normalizedCategory = args.category?.trim();
    const normalizedFaculty = args.faculty?.trim();

    if (normalizedCategory && args.grade) {
      const questions = await ctx.db
        .query("questions")
        .withIndex("by_category_grade", (q) =>
          q.eq("category", normalizedCategory).eq("grade", args.grade!),
        )
        .collect();
      const filtered = normalizedFaculty
        ? questions.filter((question) => (question.faculty ?? "") === normalizedFaculty)
        : questions;
      return filtered.slice(0, limit).map((question) => question._id);
    }

    if (normalizedCategory) {
      const questions = await ctx.db
        .query("questions")
        .withIndex("by_category", (q) => q.eq("category", normalizedCategory))
        .take(limit);
      return questions.map((question) => question._id);
    }

    const questions = await ctx.db.query("questions").withIndex("by_createdAt").order("desc").take(limit);
    return questions.map((question) => question._id);
  },
});

export const getMatchmakingOptions = query({
  args: {
    grade: v.optional(v.union(v.literal("middle"), v.literal("high"), v.literal("college"))),
    faculty: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const normalizedFaculty = args.faculty?.trim();
    const activeTopics = await ctx.db
      .query("topics")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .collect();
    const questions = await ctx.db.query("questions").collect();

    const questionFiltered = questions.filter((q) => {
      if (args.grade && q.grade !== args.grade) return false;
      if (normalizedFaculty && (q.faculty ?? "") !== normalizedFaculty) return false;
      return true;
    });
    const topicFromQuestions = questionFiltered.map((q) => q.category.trim()).filter(Boolean);

    const topicConfigFiltered = activeTopics.filter((topic) => {
      if (args.grade && topic.grade && topic.grade !== args.grade) return false;
      if (args.grade === "college" && topic.grade !== "college") return false;
      if (normalizedFaculty && (topic.faculty ?? "") !== normalizedFaculty) return false;
      return true;
    });
    const topicFromConfig = topicConfigFiltered.map((topic) => topic.name.trim()).filter(Boolean);
    const topics = Array.from(new Set([...topicFromConfig, ...topicFromQuestions])).sort((a, b) =>
      a.localeCompare(b),
    );

    const grades = Array.from(new Set(questions.map((q) => q.grade)));
    return {
      topics,
      grades,
      faculties: collegeFaculties,
    };
  },
});