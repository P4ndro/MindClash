import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const defaultTopics = [
  "Mathematics",
  "Science",
  "Physics",
  "Chemistry",
  "Biology",
  "History",
  "Geography",
  "Computer Science",
  "Economics",
  "Literature",
];

const kiuCollegeCurriculumByFaculty: Record<string, string[]> = {
  "Computer Science": [
    "Introduction to Programming",
    "Object-Oriented Programming (Java)",
    "Data Structures and Algorithms",
    "Databases",
    "Theory of Computation",
    "Computer Networks",
    "Operating Systems",
    "Software Engineering",
    "Artificial Intelligence",
    "Information Security",
  ],
  Management: [
    "Principles of Management",
    "Microeconomics",
    "Macroeconomics",
    "Marketing Management",
    "Financial Accounting",
    "Corporate Finance",
    "Operations Management",
    "Organizational Behavior",
    "Business Analytics",
    "Strategic Management",
  ],
  Law: [
    "Introduction to Law",
    "Constitutional Law",
    "Civil Law",
    "Criminal Law",
    "Administrative Law",
    "International Public Law",
    "European Union Law",
    "Business Law",
    "Tax Law",
    "Data Protection and IT Law",
  ],
};

function toSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export const getActiveTopics = query({
  args: {
    grade: v.optional(v.union(v.literal("middle"), v.literal("high"), v.literal("college"))),
    faculty: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const topics = await ctx.db
      .query("topics")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .collect();
    const normalizedFaculty = args.faculty?.trim();
    return topics
      .filter((topic) => {
        if (args.grade && topic.grade && topic.grade !== args.grade) return false;
        if (args.grade && !topic.grade && args.grade === "college") return false;
        if (normalizedFaculty && topic.faculty !== normalizedFaculty) return false;
        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  },
});

export const upsertTopic = mutation({
  args: {
    name: v.string(),
    grade: v.optional(v.union(v.literal("middle"), v.literal("high"), v.literal("college"))),
    faculty: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const name = args.name.trim();
    if (!name) throw new Error("Topic name is required");

    const slug = toSlug(name);
    if (!slug) throw new Error("Topic slug is invalid");

    const normalizedFaculty = args.faculty?.trim() || undefined;
    const candidates = await ctx.db.query("topics").withIndex("by_slug", (q) => q.eq("slug", slug)).collect();
    const existing =
      candidates.find(
        (topic) => topic.grade === args.grade && (topic.faculty ?? undefined) === normalizedFaculty,
      ) ?? null;

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        name,
        grade: args.grade ?? existing.grade,
        faculty: normalizedFaculty ?? existing.faculty,
        isActive: args.isActive ?? existing.isActive,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("topics", {
      name,
      slug,
      grade: args.grade,
      faculty: normalizedFaculty,
      isActive: args.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const seedDefaultTopics = mutation({
  handler: async (ctx) => {
    const now = Date.now();
    const inserted: string[] = [];

    for (const name of defaultTopics) {
      const slug = toSlug(name);
      const existing = await ctx.db
        .query("topics")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .unique();

      if (existing) continue;

      await ctx.db.insert("topics", {
        name,
        slug,
        grade: undefined,
        faculty: undefined,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
      inserted.push(name);
    }

    return {
      insertedCount: inserted.length,
      inserted,
    };
  },
});

export const seedKiuCollegeCurriculumTopics = mutation({
  handler: async (ctx) => {
    const now = Date.now();
    const inserted: Array<{ faculty: string; topic: string }> = [];

    for (const [faculty, topics] of Object.entries(kiuCollegeCurriculumByFaculty)) {
      for (const topicName of topics) {
        const slug = toSlug(topicName);
        const existing = await ctx.db
          .query("topics")
          .withIndex("by_slug", (q) => q.eq("slug", slug))
          .collect();

        const exact = existing.find(
          (topic) => topic.grade === "college" && topic.faculty === faculty,
        );
        if (exact) continue;

        await ctx.db.insert("topics", {
          name: topicName,
          slug,
          grade: "college",
          faculty,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        });
        inserted.push({ faculty, topic: topicName });
      }
    }

    return {
      insertedCount: inserted.length,
      inserted,
    };
  },
});
