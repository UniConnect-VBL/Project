/**
 * Worker Entry Point
 * Processes background jobs from Redis queues
 *
 * Rule 5: Heavy tasks (OCR, Moderation, Embeddings) MUST be offloaded to Redis Queue
 */
import { createClient } from "redis";
import { createClient as createSupabase } from "@supabase/supabase-js";
import { env } from "./env.js";
import {
  handleVerificationJob,
  handleModerationJob,
  handleRecommendationJob,
  handleEscrowReleaseJob,
} from "./jobs/index.js";

// Initialize Redis client with validated env
const redis = createClient({ url: env.REDIS_URL });
redis.on("error", (err) => console.error("Redis error", err));

// Initialize Supabase client with validated env
const supabase = createSupabase(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

// Rate limiter: max 5 jobs per second
let lastProcessTime = 0;
const MIN_INTERVAL_MS = 200; // 5 jobs/second = 200ms between jobs

async function processJob(queue: string, payload: string) {
  const now = Date.now();
  const elapsed = now - lastProcessTime;
  if (elapsed < MIN_INTERVAL_MS) {
    await new Promise((resolve) =>
      setTimeout(resolve, MIN_INTERVAL_MS - elapsed)
    );
  }
  lastProcessTime = Date.now();

  const data = JSON.parse(payload);

  try {
    if (queue === "verification") {
      await handleVerificationJob(data, supabase);
    } else if (queue === "moderation") {
      await handleModerationJob(data, supabase);
    } else if (queue === "recommendation") {
      await handleRecommendationJob(data, supabase);
    } else if (queue === "escrow_release") {
      await handleEscrowReleaseJob(data, supabase);
    } else {
      console.warn("Unknown queue:", queue);
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error processing job from ${queue}:`, message);
  }
}

/**
 * Check for escrow releases that are ready
 * Rule 11: Auto-transfer funds after 3 days if no dispute
 */
async function checkEscrowReleases() {
  // Check for transactions ready to release
  const { data: transactions } = await supabase
    .from("transactions")
    .select("id")
    .eq("status", "escrow_hold")
    .is("deleted_at", null) // Rule 3: Always filter deleted_at
    .lte("escrow_release_at", new Date().toISOString())
    .limit(10);

  if (transactions && transactions.length > 0) {
    for (const tx of transactions) {
      await handleEscrowReleaseJob({ transaction_id: tx.id }, supabase);
    }
  }
}

async function main() {
  await redis.connect();
  console.log(`✅ Worker connected to Redis at ${env.REDIS_URL}`);
  console.log(`✅ Worker connected to Supabase`);

  // Check escrow releases every minute
  setInterval(checkEscrowReleases, 60_000);

  // Rule 67: Cleanup old verification proofs daily (run at startup then every 24h)
  const runCleanup = async () => {
    try {
      const { cleanupVerificationProofs } = await import("./jobs/cleanup.js");
      const result = await cleanupVerificationProofs(supabase);
      console.log(`[Cleanup] Completed: ${result.deletedCount} proofs deleted`);
      if (result.errors.length > 0) {
        console.warn("[Cleanup] Errors:", result.errors);
      }
    } catch (err) {
      console.error("[Cleanup] Failed:", err);
    }
  };

  // Run cleanup on startup (after 30s delay) and then daily
  setTimeout(runCleanup, 30_000);
  setInterval(runCleanup, 24 * 60 * 60 * 1000); // 24 hours

  console.log(
    "🎧 Listening for jobs on queues: verification, moderation, recommendation, escrow_release"
  );

  while (true) {
    const job = await redis.blPop(
      ["verification", "moderation", "recommendation", "escrow_release"],
      0
    );
    if (!job) continue;

    const { key: queue, element: payload } = job;
    await processJob(queue, payload);
  }
}

main().catch((err) => {
  console.error("Worker crashed", err);
  process.exit(1);
});
