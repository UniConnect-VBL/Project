import { Request, Response } from "express";
import {
  createJob as createJobService,
  getJobs as getJobsService,
  applyToJob as applyToJobService,
  getApplicationsByUser,
} from "../services/job.service.js";
import {
  createSuccessResponse,
  createErrorResponse,
  ErrorCodes,
} from "@unihood/types";
import { asyncHandler } from "../utils/asyncHandler.js";
import type { AuthedRequest } from "../middlewares/auth.js";

/**
 * Create a new job
 * Rule 5.67: Use asyncHandler wrapper
 */
export const createJob = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as AuthedRequest).user?.id;
  if (!userId) {
    res
      .status(401)
      .json(createErrorResponse(ErrorCodes.AUTH_UNAUTHORIZED, "Unauthorized"));
    return;
  }

  const job = await createJobService(userId, req.body);
  res.json(createSuccessResponse(job));
});

/**
 * Get jobs list
 * Rule 5.67: Use asyncHandler wrapper
 */
export const getJobs = asyncHandler(async (req: Request, res: Response) => {
  const { filter, search, limit } = req.query;
  const jobs = await getJobsService({
    schoolId: filter as string,
    search: search as string,
    limit: limit ? Number(limit) : undefined,
  });
  res.json(createSuccessResponse(jobs));
});

/**
 * Apply to a job
 * Rule 5.67: Use asyncHandler wrapper
 */
export const applyToJob = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as AuthedRequest).user?.id;
  if (!userId) {
    res
      .status(401)
      .json(createErrorResponse(ErrorCodes.AUTH_UNAUTHORIZED, "Unauthorized"));
    return;
  }

  const application = await applyToJobService(userId, req.body);
  res.json(createSuccessResponse(application));
});

/**
 * Get user's job applications
 * Rule 5.67: Use asyncHandler wrapper
 */
export const getMyApplications = asyncHandler(
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

    const applications = await getApplicationsByUser(userId);
    res.json(createSuccessResponse(applications));
  }
);
