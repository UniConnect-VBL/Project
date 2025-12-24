/**
 * User Controller - Self-Service Features
 *
 * Handles user-facing endpoints including:
 * - Profile management
 * - Data deletion (Nuke feature - Rule 94)
 * Rule 5.67: Use asyncHandler wrapper
 */

import { Request, Response } from "express";
import {
  createSuccessResponse,
  createErrorResponse,
  ErrorCodes,
} from "@unihood/types";
import { nukeUserData, requestNuke } from "../services/nuke.service.js";
import { getSupabaseService } from "../utils/supabase.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Use simple type annotation instead of extending Request
type AuthedRequest = Request & {
  user?: { id: string; email: string };
};

/**
 * Request deletion of all user data (Nuke feature)
 * POST /api/users/me/nuke
 */
export const nukeMyData = asyncHandler<AuthedRequest>(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    res
      .status(401)
      .json(createErrorResponse(ErrorCodes.AUTH_UNAUTHORIZED, "Unauthorized"));
    return;
  }

  const { reason, confirm } = req.body;

  // Require explicit confirmation
  if (confirm !== "DELETE_ALL_MY_DATA") {
    res
      .status(400)
      .json(
        createErrorResponse(
          ErrorCodes.VALIDATION_REQUIRED,
          "You must confirm deletion by setting confirm: 'DELETE_ALL_MY_DATA'"
        )
      );
    return;
  }

  // Execute the nuke
  const result = await nukeUserData(getSupabaseService(), userId);

  if (result.success) {
    res.json(
      createSuccessResponse({
        message: "All your data has been permanently deleted",
        deletedCounts: result.deletedCounts,
      })
    );
  } else {
    res
      .status(500)
      .json(
        createErrorResponse(
          ErrorCodes.INTERNAL_ERROR,
          "Failed to delete all data",
          { errors: result.errors, deletedCounts: result.deletedCounts }
        )
      );
  }
});

/**
 * Request nuke (for cases requiring admin approval)
 * POST /api/users/me/nuke-request
 */
export const requestMyNuke = asyncHandler<AuthedRequest>(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    res
      .status(401)
      .json(createErrorResponse(ErrorCodes.AUTH_UNAUTHORIZED, "Unauthorized"));
    return;
  }

  const { reason } = req.body;

  const result = await requestNuke(getSupabaseService(), userId, reason);

  res.json(
    createSuccessResponse({
      message: "Your data deletion request has been submitted",
      requestId: result.requestId,
    })
  );
});
