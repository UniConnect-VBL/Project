import { Request, Response } from "express";
import { supabase } from "../utils/supabase.js";
import {
  createSuccessResponse,
  createErrorResponse,
  ErrorCodes,
} from "@unihood/types";
import { asyncHandler } from "../utils/asyncHandler.js";
import type { AuthedRequest } from "../middlewares/auth.js";

/**
 * Get AI recommendations (Premium feature)
 * Rule 5.67: Use asyncHandler wrapper
 */
export const getRecommendations = asyncHandler(
  async (req: Request, res: Response) => {
    const user = (req as AuthedRequest).user;
    if (!user) {
      res
        .status(401)
        .json(
          createErrorResponse(ErrorCodes.AUTH_UNAUTHORIZED, "Unauthorized")
        );
      return;
    }

    // Check premium status
    if (!user.is_premium) {
      res
        .status(403)
        .json(
          createErrorResponse(
            ErrorCodes.PERMISSION_TIER_TOO_LOW,
            "Premium feature only"
          )
        );
      return;
    }

    // TODO: Implement pgvector KNN search based on user's embedding
    // For now, return empty array
    const items: unknown[] = [];

    res.json(createSuccessResponse(items));
  }
);
