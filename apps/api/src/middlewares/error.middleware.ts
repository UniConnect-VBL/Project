import type { Request, Response, NextFunction } from "express";
import { ErrorCodes } from "@unihood/types";
import { env } from "../env.js";

/**
 * Custom Error interface for typed errors
 */
interface AppError extends Error {
  status?: number;
  code?: string;
}

/**
 * Centralized Error Handling Middleware
 * Rule 8: Error Handling & Localization Strategy
 * Rule 5.68: Middleware Organization - middleware logic MUST reside in separate files
 *
 * - Returns ErrorCodes enum values, never Vietnamese strings
 * - Hides raw error messages in production (NEVER leak SQL errors)
 * - Shows detailed messages only in development for debugging
 */
export const errorMiddleware = (
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  console.error("[ErrorHandler]", err);

  // Use error's status/code if available, otherwise default to 500/INTERNAL_ERROR
  const statusCode = err.status || 500;
  const errorCode = err.code || ErrorCodes.INTERNAL_ERROR;

  // Rule 8: "Dev debug only" - hide detailed messages in production
  const message = env.NODE_ENV === "development" ? err.message : "System busy";

  res.status(statusCode).json({
    success: false,
    code: errorCode,
    error: message,
  });
};
