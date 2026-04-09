import type { RequestHandler } from "express";
import { createUser, findUserByClerkId, listUsers } from "./users.service";

const buildFallbackUsername = (clerkId: string): string =>
  `player_${clerkId.slice(-6).toLowerCase()}`;

const sanitizeUsername = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, 32);
};

export const getUsers: RequestHandler = async (_req, res, next) => {
  try {
    const users = await listUsers();
    return res.status(200).json({ success: true, data: users });
  } catch (error) {
    return next(error);
  }
};

export const syncUser: RequestHandler = async (req, res, next) => {
  try {
    const clerkId = res.locals?.auth?.clerkId as string | undefined;
    if (!clerkId) {
      return res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Authentication required" },
      });
    }

    const existingUser = await findUserByClerkId(clerkId);
    if (existingUser) {
      return res.status(200).json({ success: true, data: existingUser });
    }

    const requestedUsername = sanitizeUsername(req.body?.username);
    const createdUser = await createUser(
      clerkId,
      requestedUsername ?? buildFallbackUsername(clerkId),
    );

    return res.status(201).json({ success: true, data: createdUser });
  } catch (error) {
    return next(error);
  }
};

export const getMe: RequestHandler = async (_req, res, next) => {
  try {
    const clerkId = res.locals?.auth?.clerkId as string | undefined;
    if (!clerkId) {
      return res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Authentication required" },
      });
    }

    const user = await findUserByClerkId(clerkId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { code: "USER_NOT_FOUND", message: "User not found" },
      });
    }

    return res.status(200).json({ success: true, data: user });
  } catch (error) {
    return next(error);
  }
};