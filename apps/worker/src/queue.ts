/**
 * BullMQ Queue Configuration
 *
 * Rule 5: Async Processing & Reliability
 * - BullMQ Strategy: Heavy tasks MUST be offloaded to Redis Queue
 * - AI Retry Logic: All external AI calls MUST implement Exponential Backoff retry
 * - DLQ: Failed jobs after 5 retries MUST be moved to DLQ for manual admin inspection
 */

import { Queue, QueueEvents } from "bullmq";
import IORedis from "ioredis";
import { env } from "./env.js";

// Parse Redis URL for IORedis
const redisUrl = new URL(env.REDIS_URL);

// IORedis connection for BullMQ
export const redisConnection = new IORedis({
  host: redisUrl.hostname,
  port: parseInt(redisUrl.port || "6379"),
  password: redisUrl.password || undefined,
  maxRetriesPerRequest: null, // Required for BullMQ
  enableReadyCheck: false,
});

// ============================================================================
// QUEUE DEFINITIONS
// ============================================================================

/** Verification queue - OCR processing with Gemini */
export const verificationQueue = new Queue("verification", {
  connection: redisConnection,
});

/** Moderation queue - Toxic content check with Gemini */
export const moderationQueue = new Queue("moderation", {
  connection: redisConnection,
});

/** Recommendation queue - Generate embeddings */
export const recommendationQueue = new Queue("recommendation", {
  connection: redisConnection,
});

/** Escrow queue - Auto-release funds after 3 days */
export const escrowQueue = new Queue("escrow", { connection: redisConnection });

/** Dead Letter Queue - Failed jobs for admin inspection */
export const dlqQueue = new Queue("dead-letter-queue", {
  connection: redisConnection,
});

// ============================================================================
// DEFAULT JOB OPTIONS
// ============================================================================

/**
 * Default job options with Exponential Backoff
 *
 * Retry pattern: 2s → 4s → 8s → 16s → 32s (5 attempts total)
 * After 5 failures → move to DLQ
 */
export const defaultJobOptions = {
  attempts: 5,
  backoff: {
    type: "exponential" as const,
    delay: 2000, // Start with 2 seconds
  },
  removeOnComplete: {
    count: 100, // Keep last 100 completed jobs
  },
  removeOnFail: false, // Keep failed jobs for inspection
};

/**
 * Rate-limited job options for Gemini API
 *
 * Free tier limits: ~60 RPM
 * Adjust based on your account tier
 */
export const geminiJobOptions = {
  ...defaultJobOptions,
  // Add rate limiting for Gemini calls
};

// ============================================================================
// QUEUE EVENT LISTENERS
// ============================================================================

/** Listen for queue events */
export function setupQueueEvents() {
  const verificationEvents = new QueueEvents("verification", {
    connection: redisConnection,
  });
  const moderationEvents = new QueueEvents("moderation", {
    connection: redisConnection,
  });

  verificationEvents.on("completed", ({ jobId }) => {
    console.log(`✅ Verification job ${jobId} completed`);
  });

  verificationEvents.on("failed", ({ jobId, failedReason }) => {
    console.error(`❌ Verification job ${jobId} failed: ${failedReason}`);
  });

  moderationEvents.on("completed", ({ jobId }) => {
    console.log(`✅ Moderation job ${jobId} completed`);
  });

  moderationEvents.on("failed", ({ jobId, failedReason }) => {
    console.error(`❌ Moderation job ${jobId} failed: ${failedReason}`);
  });
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Add job to verification queue
 */
export async function addVerificationJob(data: {
  userId: string;
  imageUrl: string;
}) {
  return verificationQueue.add("ocr", data, defaultJobOptions);
}

/**
 * Add job to moderation queue
 */
export async function addModerationJob(data: {
  contentId: string;
  contentType: "post" | "material" | "comment";
  content: string;
}) {
  return moderationQueue.add("check", data, defaultJobOptions);
}

/**
 * Add job to recommendation queue
 */
export async function addRecommendationJob(data: {
  contentId: string;
  contentType: "post" | "material" | "job";
  content: string;
}) {
  return recommendationQueue.add("embed", data, defaultJobOptions);
}

/**
 * Move failed job to DLQ
 */
export async function moveToDeadLetterQueue(
  originalQueue: string,
  jobId: string,
  jobData: unknown,
  error: string
) {
  return dlqQueue.add("failed-job", {
    originalQueue,
    originalJobId: jobId,
    data: jobData,
    error,
    failedAt: new Date().toISOString(),
  });
}
