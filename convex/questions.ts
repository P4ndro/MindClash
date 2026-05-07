import { api, internal } from "./_generated/api";
import { action, internalAction, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { requireAdmin } from "./auth";

const collegeFaculties = ["Management", "Computer Science", "Law"];
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
const GEMINI_FALLBACK_MODELS = (process.env.GEMINI_FALLBACK_MODELS ?? "gemini-2.0-flash")
  .split(",")
  .map((model) => model.trim())
  .filter(Boolean);
const DEFAULT_AI_DUEL_QUESTION_COUNT = 5;
const GEMINI_MAX_ATTEMPTS = 3;
const GEMINI_RETRY_BASE_MS = 700;

type AiGeneratedQuestion = {
  text: string;
  difficulty: "easy" | "medium" | "hard";
  category: string;
  questionType: "open_ended" | "msq";
  options?: string[];
  correctValue?: string;
};

function shouldRetryGeminiStatus(status: number): boolean {
  return status === 429 || status === 500 || status === 503 || status === 504;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getModelCandidates(): string[] {
  return Array.from(new Set([GEMINI_MODEL, ...GEMINI_FALLBACK_MODELS]));
}

async function generateQuestionsWithGemini(params: {
  topic: string;
  grade: "middle" | "high" | "college";
  faculty?: string;
  rating: number;
  count: number;
  recentQuestionTexts: string[];
}): Promise<AiGeneratedQuestion[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("ai_unavailable: GEMINI_API_KEY is missing");
  }

  const avoidList = params.recentQuestionTexts.slice(0, 30);
  const prompt = `
You are generating fair 1v1 quiz questions for MindClash.

Context:
- Topic: ${params.topic}
- Grade: ${params.grade}
- Faculty: ${params.faculty ?? "none"}
- Player rating context: ${params.rating}
- Total questions needed: ${params.count}

Rules:
1) Return exactly ${params.count} questions.
2) Include a balanced mix: at least 3 "msq" and at least 2 "open_ended".
3) Difficulty distribution by rating:
   - rating < 900: mostly easy
   - 900-1300: easy/medium mix
   - 1300-1700: mostly medium
   - >1700: medium/hard mix
4) Avoid repeating these recent questions:
${avoidList.length > 0 ? avoidList.map((q) => `- ${q}`).join("\n") : "- (none)"}
5) For "msq":
   - provide exactly 4 options
   - exactly one correct answer
   - correctValue must exactly match one option
6) For "open_ended":
   - do not provide options
   - provide a strict canonical expected answer in correctValue
   - answer should be concise and objectively gradable
7) Keep questions non-trivial (not too easy) and concise.
8) No duplicate questions in this batch.

Output JSON only in this exact shape:
{
  "questions": [
    {
      "text": "...",
      "difficulty": "easy|medium|hard",
      "category": "${params.topic}",
      "questionType": "msq|open_ended",
      "options": ["...","...","...","..."], // msq only
      "correctValue": "..."
    }
  ]
}
`.trim();

  let response: Response | null = null;
  let lastFailureDetails = "";
  const modelCandidates = getModelCandidates();
  for (const model of modelCandidates) {
    for (let attempt = 1; attempt <= GEMINI_MAX_ATTEMPTS; attempt += 1) {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.7,
              responseMimeType: "application/json",
            },
          }),
        },
      );

      if (response.ok) break;

      const responseText = (await response.text()).slice(0, 240).replace(/\s+/g, " ");
      lastFailureDetails = `${model} -> ${response.status}${responseText ? `: ${responseText}` : ""}`;
      if (response.status === 404) {
        break;
      }
      const canRetry = shouldRetryGeminiStatus(response.status) && attempt < GEMINI_MAX_ATTEMPTS;
      if (!canRetry) {
        break;
      }
      const waitMs = GEMINI_RETRY_BASE_MS * 2 ** (attempt - 1);
      await sleep(waitMs);
    }
    if (response?.ok) break;
  }

  if (!response || !response.ok) {
    throw new Error(`ai_unavailable: Gemini request failed (${lastFailureDetails || "unknown error"})`);
  }

  const data = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) throw new Error("ai_unavailable: Gemini returned empty response");

  let parsed: { questions?: AiGeneratedQuestion[] };
  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new Error("ai_unavailable: Gemini returned invalid JSON");
  }

  const questions = parsed.questions ?? [];
  if (questions.length !== params.count) {
    throw new Error("ai_unavailable: Gemini returned unexpected question count");
  }

  const normalized = questions.map((q) => ({
    text: q.text?.trim(),
    difficulty: q.difficulty,
    category: q.category?.trim(),
    questionType: q.questionType,
    options: q.options?.map((opt) => opt.trim()).filter(Boolean),
    correctValue: q.correctValue?.trim(),
  }));

  for (const q of normalized) {
    if (!q.text || !q.category || !q.correctValue) {
      throw new Error("ai_unavailable: Gemini returned incomplete question data");
    }
    if (!["easy", "medium", "hard"].includes(q.difficulty)) {
      throw new Error("ai_unavailable: Gemini returned invalid difficulty");
    }
    if (q.questionType === "msq") {
      if (!q.options || q.options.length !== 4) {
        throw new Error("ai_unavailable: Gemini returned invalid MSQ options");
      }
      if (!q.options.some((opt) => opt.toLowerCase() === q.correctValue!.toLowerCase())) {
        throw new Error("ai_unavailable: Gemini MSQ correctValue not in options");
      }
    }
  }

  return normalized as AiGeneratedQuestion[];
}

export const generateAiQuestionsWithGemini = internalAction({
  args: {
    topic: v.string(),
    grade: v.union(v.literal("middle"), v.literal("high"), v.literal("college")),
    faculty: v.optional(v.string()),
    rating: v.number(),
    count: v.number(),
    recentQuestionTexts: v.array(v.string()),
  },
  handler: async (_ctx, args) => {
    return await generateQuestionsWithGemini({
      topic: args.topic,
      grade: args.grade,
      faculty: args.faculty,
      rating: args.rating,
      count: args.count,
      recentQuestionTexts: args.recentQuestionTexts,
    });
  },
});

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

export const getRecentQuestionTextsForTopic = internalQuery({
  args: {
    topic: v.string(),
    grade: v.union(v.literal("middle"), v.literal("high"), v.literal("college")),
    faculty: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existingTopicQuestions = await ctx.db
      .query("questions")
      .withIndex("by_category_grade", (q) => q.eq("category", args.topic).eq("grade", args.grade))
      .collect();
    return existingTopicQuestions
      .filter((q) => (!args.faculty ? true : (q.faculty ?? "") === args.faculty))
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 30)
      .map((q) => q.text);
  },
});

export const getFallbackDuelQuestionIds = internalQuery({
  args: {
    topic: v.string(),
    grade: v.union(v.literal("middle"), v.literal("high"), v.literal("college")),
    faculty: v.optional(v.string()),
    count: v.number(),
  },
  handler: async (ctx, args) => {
    const topicQuestions = await ctx.db
      .query("questions")
      .withIndex("by_category_grade", (q) => q.eq("category", args.topic).eq("grade", args.grade))
      .collect();
    const filteredTopic = topicQuestions.filter((question) => {
      if (args.faculty && (question.faculty ?? "") !== args.faculty) return false;
      return true;
    });
    const withAnswerKey = await Promise.all(
      filteredTopic.map(async (question) => {
        const answerDoc = await ctx.db
          .query("answers")
          .withIndex("by_questionId", (q) => q.eq("questionId", question._id))
          .unique();
        return { question, hasAnswerKey: Boolean(answerDoc?.correctValue?.trim()) };
      }),
    );
    const gradedEligible = withAnswerKey
      .filter((item) => {
        const type = item.question.questionType ?? "open_ended";
        if (type === "open_ended" && !item.hasAnswerKey) return false;
        return true;
      })
      .map((item) => item.question);
    const sorted = gradedEligible.sort((a, b) => b.createdAt - a.createdAt);
    const msq = sorted.filter((question) => (question.questionType ?? "open_ended") === "msq");
    const openEnded = sorted.filter((question) => (question.questionType ?? "open_ended") === "open_ended");

    // Keep fallback gameplay shape close to AI output: prefer 3 MSQ + 2 open-ended for 5-question duels.
    const preferredOpen = args.count >= 5 ? 2 : 1;
    let openTarget = Math.min(preferredOpen, openEnded.length, args.count);
    let msqTarget = Math.min(args.count - openTarget, msq.length);

    if (msqTarget === 0 && msq.length > 0) {
      msqTarget = 1;
      openTarget = Math.max(0, Math.min(openTarget, args.count - 1));
    }
    while (openTarget + msqTarget < args.count) {
      if (msqTarget < msq.length) {
        msqTarget += 1;
        continue;
      }
      if (openTarget < openEnded.length) {
        openTarget += 1;
        continue;
      }
      break;
    }

    return [...msq.slice(0, msqTarget), ...openEnded.slice(0, openTarget)]
      .slice(0, args.count)
      .map((question) => question._id);
  },
});

export const insertGeneratedAiQuestions = internalMutation({
  args: {
    topic: v.string(),
    grade: v.union(v.literal("middle"), v.literal("high"), v.literal("college")),
    faculty: v.optional(v.string()),
    generated: v.array(
      v.object({
        text: v.string(),
        difficulty: v.union(v.literal("easy"), v.literal("medium"), v.literal("hard")),
        category: v.string(),
        questionType: v.union(v.literal("open_ended"), v.literal("msq")),
        options: v.optional(v.array(v.string())),
        correctValue: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const questionIds = [];
    for (const question of args.generated) {
      const questionId = await ctx.db.insert("questions", {
        text: question.text,
        difficulty: question.difficulty,
        category: args.topic,
        grade: args.grade,
        faculty: args.faculty,
        questionType: question.questionType,
        options: question.questionType === "msq" ? question.options : undefined,
        createdAt: now,
        updatedAt: now,
      });
      if (question.correctValue) {
        await ctx.db.insert("answers", {
          questionId,
          correctValue: question.correctValue,
          createdAt: now,
          updatedAt: now,
        });
      }
      questionIds.push(questionId);
    }
    return questionIds;
  },
});

export const generateAiDuelQuestions = action({
  args: {
    topic: v.string(),
    grade: v.union(v.literal("middle"), v.literal("high"), v.literal("college")),
    faculty: v.optional(v.string()),
    rating: v.number(),
    count: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("unauthenticated: You must be signed in.");
    const user = await ctx.runQuery(api.users.getUserOptional, {});
    if (!user) throw new Error("unknown_user: Signed-in user profile not found.");

    const count = Math.max(1, Math.min(10, Math.floor(args.count ?? DEFAULT_AI_DUEL_QUESTION_COUNT)));
    const topic = args.topic.trim();
    const faculty = args.faculty?.trim() || undefined;
    if (!topic) throw new Error("validation_error: topic is required");

    const recentQuestionTexts: string[] = await ctx.runQuery(internal.questions.getRecentQuestionTextsForTopic, {
      topic,
      grade: args.grade,
      faculty,
    });

    let questionIds: Id<"questions">[] = [];
    let modelUsed = GEMINI_MODEL;
    try {
      const generated: AiGeneratedQuestion[] = await ctx.runAction(internal.questions.generateAiQuestionsWithGemini, {
        topic,
        grade: args.grade,
        faculty,
        rating: args.rating,
        count,
        recentQuestionTexts,
      });

      questionIds = await ctx.runMutation(internal.questions.insertGeneratedAiQuestions, {
        topic,
        grade: args.grade,
        faculty,
        generated,
      });
    } catch {
      questionIds = await ctx.runQuery(internal.questions.getFallbackDuelQuestionIds, {
        topic,
        grade: args.grade,
        faculty,
        count,
      });
      modelUsed = "local_fallback_bank";
    }

    if (questionIds.length === 0) {
      throw new Error("ai_unavailable: No questions available for this topic right now");
    }

    return {
      questionIds,
      count: questionIds.length,
      model: modelUsed,
    };
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
    const isAutoGradable = (questionType?: "open_ended" | "msq") =>
      (questionType ?? "open_ended") === "msq";

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
      return filtered.filter((question) => isAutoGradable(question.questionType)).slice(0, limit).map((question) => question._id);
    }

    if (normalizedCategory) {
      const questions = await ctx.db
        .query("questions")
        .withIndex("by_category", (q) => q.eq("category", normalizedCategory))
        .take(limit);
      return questions.filter((question) => isAutoGradable(question.questionType)).map((question) => question._id);
    }

    const questions = await ctx.db.query("questions").withIndex("by_createdAt").order("desc").take(limit);
    return questions.filter((question) => isAutoGradable(question.questionType)).map((question) => question._id);
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