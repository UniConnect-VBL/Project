import { Request, Response } from "express";
import {
  createStream as createStreamService,
  getLiveStreams as getLiveStreamsService,
  donateToStream as donateToStreamService,
  endStream as endStreamService,
} from "../services/stream.service.js";
import {
  createSuccessResponse,
  createErrorResponse,
  ErrorCodes,
} from "@unihood/types";
import { asyncHandler } from "../utils/asyncHandler.js";

/**
 * Create a new stream
 * Rule 5.67: Use asyncHandler wrapper
 */
export const createStream = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = (req as { user?: { id: string } }).user?.id;
    if (!userId) {
      res
        .status(401)
        .json(
          createErrorResponse(ErrorCodes.AUTH_UNAUTHORIZED, "Unauthorized")
        );
      return;
    }

    const stream = await createStreamService(userId, req.body);
    res.json(createSuccessResponse(stream));
  }
);

/**
 * Get live streams
 * Rule 5.67: Use asyncHandler wrapper
 */
export const getLiveStreams = asyncHandler(
  async (req: Request, res: Response) => {
    const { filter } = req.query;
    const streams = await getLiveStreamsService(filter as string);
    res.json(createSuccessResponse(streams));
  }
);

/**
 * Donate to a stream
 * Rule 5.67: Use asyncHandler wrapper
 */
export const donateToStream = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = (req as { user?: { id: string } }).user?.id;
    if (!userId) {
      res
        .status(401)
        .json(
          createErrorResponse(ErrorCodes.AUTH_UNAUTHORIZED, "Unauthorized")
        );
      return;
    }

    const transaction = await donateToStreamService(userId, req.body);
    res.json(createSuccessResponse(transaction));
  }
);

/**
 * End a stream
 * Rule 5.67: Use asyncHandler wrapper
 */
export const endStream = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as { user?: { id: string } }).user?.id;
  if (!userId) {
    res
      .status(401)
      .json(createErrorResponse(ErrorCodes.AUTH_UNAUTHORIZED, "Unauthorized"));
    return;
  }

  const { id } = req.params;
  await endStreamService(id, userId);
  res.json(createSuccessResponse({ message: "Stream ended" }));
});
