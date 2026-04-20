"use client";

import { useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { useEffect, useRef } from "react";
import { api } from "../../convex/_generated/api";

/**
 * Upserts the signed-in Clerk user into Convex on every session load.
 * Webhooks only fire for new accounts; this keeps the `users` table in sync for everyone.
 */
export function UserSync() {
  const { user, isLoaded } = useUser();
  const syncUser = useMutation(api.users.syncUser);
  const lastSyncedId = useRef<string | null>(null);

  useEffect(() => {
    // #region agent log
    fetch("http://127.0.0.1:7941/ingest/31c264ca-5f6d-41fb-b78a-4754c57b0a02", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "86b558" },
      body: JSON.stringify({
        sessionId: "86b558",
        runId: "pre-fix",
        hypothesisId: "H1_H2",
        location: "src/components/UserSync.tsx:18",
        message: "UserSync effect tick",
        data: { isLoaded, hasUser: Boolean(user), userId: user?.id ?? null, lastSyncedId: lastSyncedId.current },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    if (!isLoaded || !user) {
      lastSyncedId.current = null;
      return;
    }
    if (lastSyncedId.current === user.id) return;

    const email = user.primaryEmailAddress?.emailAddress ?? "";
    const username =
      [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
      user.fullName ||
      user.username ||
      "User";

    void syncUser({
      clerkId: user.id,
      username,
      email,
    })
      .then(() => {
        // #region agent log
        fetch("http://127.0.0.1:7941/ingest/31c264ca-5f6d-41fb-b78a-4754c57b0a02", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "86b558" },
          body: JSON.stringify({
            sessionId: "86b558",
            runId: "pre-fix",
            hypothesisId: "H1",
            location: "src/components/UserSync.tsx:42",
            message: "syncUser mutation succeeded",
            data: { userId: user.id },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion
        lastSyncedId.current = user.id;
      })
      .catch((error) => {
        // #region agent log
        fetch("http://127.0.0.1:7941/ingest/31c264ca-5f6d-41fb-b78a-4754c57b0a02", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "86b558" },
          body: JSON.stringify({
            sessionId: "86b558",
            runId: "pre-fix",
            hypothesisId: "H1",
            location: "src/components/UserSync.tsx:58",
            message: "syncUser mutation failed",
            data: { errorMessage: error instanceof Error ? error.message : "unknown" },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion
      });
  }, [isLoaded, user, syncUser]);

  return null;
}
