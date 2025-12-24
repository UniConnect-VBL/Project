import type { Request, Response, NextFunction } from "express";

/**
 * Async Handler Wrapper
 * Rule 5.67: No try-catch in controllers - use this wrapper instead
 *
 * Automatically catches errors from async route handlers and passes them
 * to Express's error handling middleware.
 *
 * @example
 * export const handleGetUser = asyncHandler(async (req, res) => {
 *   const user = await userService.getById(req.params.id);
 *   res.json({ success: true, data: user });
 * });
 */
export const asyncHandler = <T extends Request = Request>(
  fn: (req: T, res: Response, next: NextFunction) => Promise<void>
) => {
  return (req: T, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
