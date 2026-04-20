import { Doc } from "./_generated/dataModel";
import { MutationCtx, QueryCtx } from "./_generated/server";

export type AuthCtx = MutationCtx | QueryCtx;

/**
 * Error codes returned by authorization helpers. Frontend code uses the
 * `code:` prefix in the error message to decide how to present the failure
 * (toast vs redirect vs inline hint).
 */
export const AUTH_ERROR_CODES = {
  UNAUTHENTICATED: "unauthenticated",
  UNKNOWN_USER: "unknown_user",
  FORBIDDEN_ADMIN: "forbidden_admin",
} as const;

function formatAuthError(
  code: (typeof AUTH_ERROR_CODES)[keyof typeof AUTH_ERROR_CODES],
  message: string,
) {
  return new Error(`${code}: ${message}`);
}

function envAdminClerkIds(): Set<string> {
  const raw = process.env.ADMIN_CLERK_IDS ?? "";
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

/**
 * Resolve the authenticated user (if any) and its role.
 *
 * Role precedence:
 *   1. Stored `users.role` field is source of truth when present.
 *   2. If missing, the user is treated as admin iff their Clerk id is listed
 *      in the `ADMIN_CLERK_IDS` env var (comma separated). This is the
 *      bootstrap escape hatch so the first admin can be granted without a
 *      chicken-and-egg problem.
 *   3. Otherwise the user is treated as a regular "user".
 */
export async function resolveCurrentUser(ctx: AuthCtx): Promise<{
  identitySubject: string;
  user: Doc<"users"> | null;
  effectiveRole: "admin" | "user";
} | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
    .unique();

  const envAdmins = envAdminClerkIds();
  const storedRole = user?.role;
  const effectiveRole: "admin" | "user" =
    storedRole === "admin" || envAdmins.has(identity.subject) ? "admin" : "user";

  return {
    identitySubject: identity.subject,
    user,
    effectiveRole,
  };
}

/**
 * Require that the caller is signed in AND has admin privileges.
 *
 * Throws errors whose message starts with a stable code so the frontend can
 * react programmatically (see `AUTH_ERROR_CODES`).
 */
export async function requireAdmin(ctx: AuthCtx): Promise<Doc<"users"> | null> {
  const resolved = await resolveCurrentUser(ctx);
  if (!resolved) {
    throw formatAuthError(
      AUTH_ERROR_CODES.UNAUTHENTICATED,
      "You must be signed in to perform this action.",
    );
  }
  if (resolved.effectiveRole !== "admin") {
    throw formatAuthError(
      AUTH_ERROR_CODES.FORBIDDEN_ADMIN,
      "Admin role required for this action.",
    );
  }
  return resolved.user;
}

/**
 * True when at least one user currently has the admin role persisted.
 * Used by `claimFirstAdmin` to gate the one-time bootstrap.
 */
export async function hasAnyAdmin(ctx: AuthCtx): Promise<boolean> {
  const anyAdmin = await ctx.db
    .query("users")
    .withIndex("by_role", (q) => q.eq("role", "admin"))
    .first();
  return Boolean(anyAdmin);
}
