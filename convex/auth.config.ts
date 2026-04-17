import { AuthConfig } from "convex/server";

/**
 * Issuer URL = Clerk Dashboard → API Keys → "Frontend API URL" (no trailing slash).
 * Clerk’s Convex setup often names this `CLERK_FRONTEND_API_URL`; older docs use
 * `CLERK_JWT_ISSUER_DOMAIN` — either is fine. Set the same variable(s) on your
 * Convex deployment (Dashboard → Env or `npx convex env set`).
 */
const clerkIssuer =
  process.env.CLERK_FRONTEND_API_URL ?? process.env.CLERK_JWT_ISSUER_DOMAIN;

if (!clerkIssuer) {
  throw new Error(
    "Set CLERK_FRONTEND_API_URL or CLERK_JWT_ISSUER_DOMAIN in Convex environment variables.",
  );
}

export default {
  providers: [
    {
      domain: clerkIssuer,
      applicationID: "convex",
    },
  ],
} satisfies AuthConfig;
