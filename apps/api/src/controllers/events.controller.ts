import { Request, Response } from "express";
import {
  createEvent as createEventService,
  getEvents as getEventsService,
  buyTicket as buyTicketService,
  getTicketsByUser,
} from "../services/event.service.js";
import {
  createSuccessResponse,
  createErrorResponse,
  ErrorCodes,
} from "@unihood/types";
import { asyncHandler } from "../utils/asyncHandler.js";
import type { AuthedRequest } from "../middlewares/auth.js";

/**
 * Create a new event
 * Rule 5.67: Use asyncHandler wrapper
 */
export const createEvent = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as AuthedRequest).user?.id;
  if (!userId) {
    res
      .status(401)
      .json(createErrorResponse(ErrorCodes.AUTH_UNAUTHORIZED, "Unauthorized"));
    return;
  }

  const event = await createEventService(userId, req.body);
  res.json(createSuccessResponse(event));
});

/**
 * Get events list
 * Rule 5.67: Use asyncHandler wrapper
 */
export const getEvents = asyncHandler(async (req: Request, res: Response) => {
  const { limit } = req.query;
  const events = await getEventsService({
    limit: limit ? Number(limit) : undefined,
  });
  res.json(createSuccessResponse(events));
});

/**
 * Buy event ticket
 * Rule 5.67: Use asyncHandler wrapper
 */
export const buyTicket = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as AuthedRequest).user?.id;
  if (!userId) {
    res
      .status(401)
      .json(createErrorResponse(ErrorCodes.AUTH_UNAUTHORIZED, "Unauthorized"));
    return;
  }

  const { id } = req.params;
  const ticket = await buyTicketService(userId, { event_id: id });
  res.json(createSuccessResponse(ticket));
});

/**
 * Get user's tickets
 * Rule 5.67: Use asyncHandler wrapper
 */
export const getMyTickets = asyncHandler(
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

    const tickets = await getTicketsByUser(userId);
    res.json(createSuccessResponse(tickets));
  }
);
