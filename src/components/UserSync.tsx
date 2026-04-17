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
    if (!isLoaded || !user) {
      lastSyncedId.current = null;
      return;
    }
    if (lastSyncedId.current === user.id) return;

    const email = user.primaryEmailAddress?.emailAddress ?? "";
    const name =
      [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
      user.fullName ||
      user.username ||
      "User";

    void syncUser({
      clerkId: user.id,
      email,
      name,
      image: user.imageUrl ?? undefined,
    }).then(() => {
      lastSyncedId.current = user.id;
    });
  }, [isLoaded, user, syncUser]);

  return null;
}
