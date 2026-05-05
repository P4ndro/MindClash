import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { hasAnyAdmin, requireAdmin, resolveCurrentUser } from "./auth";

export const syncUser = mutation({
  args: {
    clerkId: v.string(),
    username: v.string(),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (existing) {
      if (
        existing.username !== args.username ||
        existing.email !== args.email
      ) {
        await ctx.db.patch(existing._id, {
          username: args.username,
          email: args.email,
          updatedAt: Date.now(),
        });
      }
      return existing._id;
    }

    const inserted = await ctx.db.insert("users", {
      clerkId: args.clerkId,
      username: args.username,
      email: args.email,
      rating: 1000,
      updatedAt: Date.now(),
      createdAt: Date.now(),
    });
    return inserted;
  },
});

export const getUser = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    return user;
  },
});

export const getUserOptional = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    return user ?? null;
  },
});

export const getUserByClerkId = query({
  args: {
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    return user;
  },
});

export const getUserByClerkIdOptional = query({
  args: {
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();

    return user ?? null;
  },
});

export const getMyRole = query({
  handler: async (ctx) => {
    const resolved = await resolveCurrentUser(ctx);
    if (!resolved) {
      return { role: "user" as const, signedIn: false, userExists: false };
    }
    return {
      role: resolved.effectiveRole,
      signedIn: true,
      userExists: Boolean(resolved.user),
    };
  },
});

/**
 * One-time bootstrap: the very first authenticated user to call this claims
 * the admin role. After any admin exists this becomes a no-op that throws a
 * forbidden error, so it is safe to leave exposed.
 *
 * For CI/prod bootstrap prefer setting the `ADMIN_CLERK_IDS` env var and
 * calling `setUserRole` once, which is less racey.
 */
export const claimFirstAdmin = mutation({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("unauthenticated: sign in before claiming admin");
    }
    if (await hasAnyAdmin(ctx)) {
      throw new Error(
        "forbidden_admin: an admin already exists; ask them to promote you via setUserRole",
      );
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) {
      throw new Error("unknown_user: finish profile sync before claiming admin");
    }

    await ctx.db.patch(user._id, { role: "admin", updatedAt: Date.now() });
    return { userId: user._id, role: "admin" as const };
  },
});

export const setUserRole = mutation({
  args: {
    targetUserId: v.id("users"),
    role: v.union(v.literal("admin"), v.literal("user")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const target = await ctx.db.get(args.targetUserId);
    if (!target) {
      throw new Error("unknown_user: target user does not exist");
    }

    await ctx.db.patch(target._id, {
      role: args.role,
      updatedAt: Date.now(),
    });
    return { userId: target._id, role: args.role };
  },
});

export const getMyCourseRatings = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) {
      return [];
    }

    const ratings = await ctx.db
      .query("userCourseRatings")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();

    return ratings.sort((a, b) => b.rating - a.rating);
  },
});
