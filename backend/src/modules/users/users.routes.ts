import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth";
import { getMe, getUsers, syncUser } from "./users.controller";

export const usersRouter = Router();

usersRouter.get("/", requireAuth, getUsers);
usersRouter.post("/sync", requireAuth, syncUser);
usersRouter.get("/me", requireAuth, getMe);
