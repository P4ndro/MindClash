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
    // #region agent log
    fetch("http://127.0.0.1:7941/ingest/31c264ca-5f6d-41fb-b78a-4754c57b0a02", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "86b558" },
      body: JSON.stringify({
        sessionId: "86b558",
        runId: "pre-fix",
        hypothesisId: "H1",
        location: "convex/users.ts:11",
        message: "syncUser mutation called",
        data: { clerkId: args.clerkId, hasEmail: Boolean(args.email), hasUsername: Boolean(args.username) },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (existing) {
      // #region agent log
      console.log("[DBG 86b558][H1] syncUser existing", { userId: existing._id });
      // #endregion
      if (
        existing.username !== args.username ||
        existing.email !== args.email
      ) {
        await ctx.db.patch(existing._id, {
          username: args.username,
          email: args.email,
          updatedAt: Date.now(),
        });
        // #region agent log
        console.log("[DBG 86b558][H1] syncUser patched", { userId: existing._id });
        // #endregion
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
    // #region agent log
    console.log("[DBG 86b558][H1] syncUser created", { userId: inserted });
    // #endregion
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
    // #region agent log
    fetch("http://127.0.0.1:7941/ingest/31c264ca-5f6d-41fb-b78a-4754c57b0a02", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "86b558" },
      body: JSON.stringify({
        sessionId: "86b558",
        runId: "pre-fix",
        hypothesisId: "H2_H3_H4",
        location: "convex/users.ts:84",
        message: "getUserOptional auth check",
        data: { hasIdentity: Boolean(identity), subject: identity?.subject ?? null },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    if (!identity) {
      // #region agent log
      console.log("[DBG 86b558][H3] getUserOptional no identity");
      // #endregion
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    // #region agent log
    fetch("http://127.0.0.1:7941/ingest/31c264ca-5f6d-41fb-b78a-4754c57b0a02", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "86b558" },
      body: JSON.stringify({
        sessionId: "86b558",
        runId: "pre-fix",
        hypothesisId: "H2_H3_H4",
        location: "convex/users.ts:102",
        message: "getUserOptional resolved user",
        data: { foundUser: Boolean(user), userId: user?._id ?? null },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion

    if (!user) {
      // #region agent log
      console.log("[DBG 86b558][H2_H4] getUserOptional missing user for identity", {
        subject: identity.subject,
      });
      // #endregion
    }

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
    // #region agent log
    fetch("http://127.0.0.1:7941/ingest/31c264ca-5f6d-41fb-b78a-4754c57b0a02", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "86b558" },
      body: JSON.stringify({
        sessionId: "86b558",
        runId: "pre-fix",
        hypothesisId: "H5",
        location: "convex/users.ts:100",
        message: "getMyCourseRatings auth check",
        data: { hasIdentity: Boolean(identity) },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
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
