import { Router } from "express";
import { usersRouter } from "../modules/users/users.routes";

export const apiRouter = Router();

apiRouter.get("/health", (_req, res) => {
  res.status(200).json({ success: true, data: { status: "ok" } });
});

apiRouter.use("/users", usersRouter);

