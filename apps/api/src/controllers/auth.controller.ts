import { Response } from "express";
import { exchangeGoogleCode } from "../services/auth.service.js";
import type { AuthedRequest } from "../middlewares/auth.js";
import { ErrorCodes } from "@unihood/types";
import { asyncHandler } from "../utils/asyncHandler.js";

/**
 * Controller for Google OAuth code exchange
 * Rule 5.67: Use asyncHandler wrapper - no try-catch needed
 */
export const handleGoogleAuth = asyncHandler<AuthedRequest>(
  async (req, res) => {
    const { code } = req.body;

    if (!code) {
      res.status(400).json({
        success: false,
        code: ErrorCodes.AUTH_GOOGLE_CODE_REQUIRED,
        error: "Google authorization code is required",
      });
      return;
    }

    const result = await exchangeGoogleCode(code);

    res.json({
      success: true,
      data: result,
    });
  }
);

/**
 * Controller for getting current user profile
 * Optimization: Uses req.user populated by authMiddleware (no redundant DB call)
 * Rule 5.67: Use asyncHandler wrapper
 */
export const handleGetMe = asyncHandler<AuthedRequest>(async (req, res) => {
  // No need to fetch DB again - authMiddleware already populated req.user
  if (!req.user) {
    res.status(401).json({
      success: false,
      code: ErrorCodes.AUTH_UNAUTHORIZED,
      error: "Not authenticated",
    });
    return;
  }

  res.json({
    success: true,
    data: { user: req.user },
  });
});
