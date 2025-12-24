/**
 * Idempotency Service - Prevent Duplicate Transactions
 *
 * Rule 7: Payment webhooks and Marketplace Purchases MUST strictly
 * validate the idempotency_key header.
 *
 * Uses Redis for fast lookup + Postgres idempotency_keys table for persistence
 */

import { redisClient, ensureRedis } from "../utils/redis.js";
import { supabase } from "../utils/supabase.js";

const IDEMPOTENCY_TTL = 24 * 60 * 60; // 24 hours in seconds

export interface IdempotencyResult {
  /** Whether this is a duplicate request */
  isDuplicate: boolean;
  /** The cached response if duplicate */
  cachedResponse?: {
    statusCode: number;
    body: unknown;
  };
}

/**
 * Check if an idempotency key has been used before
 */
export async function checkIdempotencyKey(
  key: string,
  userId: string,
  endpoint: string
): Promise<IdempotencyResult> {
  await ensureRedis();

  const redisKey = `idempotency:${key}`;

  // First check Redis (fast path)
  const cached = await redisClient.get(redisKey);
  if (cached) {
    const parsed = JSON.parse(cached);
    return {
      isDuplicate: true,
      cachedResponse: {
        statusCode: parsed.response_code,
        body: parsed.response_body,
      },
    };
  }

  // Check Postgres (fallback for expired Redis keys)
  const { data } = await supabase
    .from("idempotency_keys")
    .select("response_code, response_body")
    .eq("key", key)
    .single();

  if (data) {
    // Restore to Redis
    await redisClient.setEx(redisKey, IDEMPOTENCY_TTL, JSON.stringify(data));

    return {
      isDuplicate: true,
      cachedResponse: {
        statusCode: data.response_code,
        body: data.response_body,
      },
    };
  }

  return { isDuplicate: false };
}

/**
 * Store an idempotency key after successful processing
 */
export async function storeIdempotencyKey(
  key: string,
  userId: string,
  endpoint: string,
  responseCode: number,
  responseBody: unknown
): Promise<void> {
  await ensureRedis();

  const redisKey = `idempotency:${key}`;
  const data = {
    response_code: responseCode,
    response_body: responseBody,
  };

  // Store in Redis with TTL
  await redisClient.setEx(redisKey, IDEMPOTENCY_TTL, JSON.stringify(data));

  // Store in Postgres for persistence
  await supabase.from("idempotency_keys").insert({
    key,
    user_id: userId,
    endpoint,
    response_code: responseCode,
    response_body: responseBody,
  });
}

/**
 * Cleanup expired idempotency keys (run as cron job)
 */
export async function cleanupExpiredKeys(): Promise<number> {
  const { data, error } = await supabase
    .from("idempotency_keys")
    .delete()
    .lt("expires_at", new Date().toISOString())
    .select("key");

  if (error) {
    console.error("Error cleaning up idempotency keys:", error);
    return 0;
  }

  return data?.length || 0;
}
