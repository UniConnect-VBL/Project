import type { Request, Response, NextFunction } from "express";
import { ensureRedis, redisClient } from "../utils/redis.js";

// ============================================================================
// IDEMPOTENCY MIDDLEWARE
// ============================================================================
// Validates x-idempotency-key header for POST/PUT/PATCH requests
// Prevents double-spending on payment webhooks and marketplace purchases
// ============================================================================

interface IdempotencyRecord {
  status: "processing" | "completed";
  response?: unknown;
  timestamp: number;
}

const IDEMPOTENCY_TTL = 24 * 60 * 60; // 24 hours in seconds

/**
 * Middleware to enforce idempotency for mutation endpoints
 *
 * How it works:
 * 1. Check if x-idempotency-key header exists
 * 2. If key already exists in Redis with "completed" status, return cached response
 * 3. If key exists with "processing" status, return 409 Conflict
 * 4. Otherwise, mark as "processing" and continue
 * 5. After response, update to "completed" with response data
 */
export function idempotencyMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Only apply to mutation methods
  const mutationMethods = ["POST", "PUT", "PATCH"];
  if (!mutationMethods.includes(req.method)) {
    return next();
  }

  const idempotencyKey = req.headers["x-idempotency-key"] as string | undefined;

  // Some endpoints may not require idempotency
  if (!idempotencyKey) {
    return next();
  }

  // Validate key format (UUID v4)
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(idempotencyKey)) {
    return res.status(400).json({
      error: "Invalid idempotency key format. Must be UUID v4.",
      code: "INVALID_IDEMPOTENCY_KEY",
    });
  }

  // Create cache key scoped to user if authenticated
  const userId =
    (req as Request & { user?: { id: string } }).user?.id || "anonymous";
  const cacheKey = `idempotency:${userId}:${idempotencyKey}`;

  // Process asynchronously
  processIdempotency(cacheKey, req, res, next).catch((error) => {
    console.error("Idempotency middleware error:", error);
    next(error);
  });
}

async function processIdempotency(
  cacheKey: string,
  req: Request,
  res: Response,
  next: NextFunction
) {
  await ensureRedis();

  // Check if key exists
  const existing = await redisClient.get(cacheKey);

  if (existing) {
    const record: IdempotencyRecord = JSON.parse(existing);

    if (record.status === "completed" && record.response) {
      // Return cached response
      return res.status(200).json(record.response);
    }

    if (record.status === "processing") {
      // Request is still being processed
      return res.status(409).json({
        error: "Request with this idempotency key is still being processed",
        code: "IDEMPOTENCY_CONFLICT",
      });
    }
  }

  // Mark as processing
  const processingRecord: IdempotencyRecord = {
    status: "processing",
    timestamp: Date.now(),
  };
  await redisClient.setEx(
    cacheKey,
    IDEMPOTENCY_TTL,
    JSON.stringify(processingRecord)
  );

  // Intercept response to cache it
  const originalJson = res.json.bind(res);
  res.json = function (body: unknown) {
    // Only cache successful responses
    if (res.statusCode >= 200 && res.statusCode < 300) {
      const completedRecord: IdempotencyRecord = {
        status: "completed",
        response: body,
        timestamp: Date.now(),
      };
      redisClient
        .setEx(cacheKey, IDEMPOTENCY_TTL, JSON.stringify(completedRecord))
        .catch((err) =>
          console.error("Failed to cache idempotency response:", err)
        );
    } else {
      // Delete processing record on error
      redisClient.del(cacheKey).catch(() => {});
    }
    return originalJson(body);
  };

  next();
}

/**
 * Strict idempotency middleware - requires the header
 * Use for critical financial endpoints (purchase, deposit, etc.)
 */
export function requireIdempotency(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const idempotencyKey = req.headers["x-idempotency-key"];

  if (!idempotencyKey) {
    return res.status(400).json({
      error: "x-idempotency-key header is required for this endpoint",
      code: "MISSING_IDEMPOTENCY_KEY",
    });
  }

  return idempotencyMiddleware(req, res, next);
}
