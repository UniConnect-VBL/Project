import { Request, Response } from "express";
import {
  createDispute as createDisputeService,
  getDisputesByUser,
} from "../services/dispute.service.js";
import {
  createSuccessResponse,
  createErrorResponse,
  ErrorCodes,
} from "@unihood/types";
import { asyncHandler } from "../utils/asyncHandler.js";
import type { AuthedRequest } from "../middlewares/auth.js";

/**
 * Create a dispute
 * Rule 5.67: Use asyncHandler wrapper
 */
export const createDispute = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = (req as AuthedRequest).user?.id;
    if (!userId) {
      res
        .status(401)
        .json(
          createErrorResponse(ErrorCodes.AUTH_UNAUTHORIZED, "Unauthorized")
        );
      return;
    }

    const dispute = await createDisputeService(userId, req.body);
    res.json(createSuccessResponse(dispute));
  }
);

/**
 * Get user's disputes
 * Rule 5.67: Use asyncHandler wrapper
 */
export const getMyDisputes = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = (req as AuthedRequest).user?.id;
    if (!userId) {
      res
        .status(401)
        .json(
          createErrorResponse(ErrorCodes.AUTH_UNAUTHORIZED, "Unauthorized")
        );
      return;
    }

    const disputes = await getDisputesByUser(userId);
    res.json(createSuccessResponse(disputes));
  }
);
