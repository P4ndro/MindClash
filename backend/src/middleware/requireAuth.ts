import type { RequestHandler } from "express";
import { getAuth } from "@clerk/express";

export const requireAuth: RequestHandler = (req, res, next) => {
  const auth = getAuth(req);

  if (!auth.userId) {
    return res.status(401).json({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Invalid or missing authentication token",
      },
    });
  }

  res.locals.auth = {
    clerkId: auth.userId,
    sessionId: auth.sessionId,
  };

  return next();
};

