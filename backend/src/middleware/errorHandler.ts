import type { ErrorRequestHandler } from "express";

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const statusCode =
    typeof err?.statusCode === "number" && err.statusCode >= 400
      ? err.statusCode
      : 500;

  const code =
    typeof err?.code === "string"
      ? err.code
      : statusCode === 500
        ? "INTERNAL_SERVER_ERROR"
        : "REQUEST_ERROR";

  const message =
    typeof err?.message === "string" && err.message.length > 0
      ? err.message
      : "Something went wrong";

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
    },
  });
};

