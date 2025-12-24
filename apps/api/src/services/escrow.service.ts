/**
 * Escrow Service
 * Handles escrow transactions for Marketplace purchases
 *
 * Rule 11: Escrow Timeline
 * - T0: Purchase (Atomic wallet lock + Move to Escrow Balance)
 * - T+3 days: Release (Transfer to Seller's Available Balance if no dispute)
 *
 * Rule 3: Financial Integrity
 * - NEVER update wallets via Node.js. ALWAYS use SQL RPC
 */
import { supabase } from "../utils/supabase.js";
import { redisClient, ensureRedis } from "../utils/redis.js";
import { ErrorCodes } from "@unihood/types";

/**
 * Schedule escrow release job
 * Will be processed by worker after delay
 */
export async function scheduleEscrowRelease(
  transactionId: string
): Promise<void> {
  await ensureRedis();

  // Get transaction to find escrow_release_at
  // Rule 3: Always filter deleted_at IS NULL
  const { data: transaction, error } = await supabase
    .from("transactions")
    .select("escrow_release_at")
    .eq("id", transactionId)
    .is("deleted_at", null)
    .single();

  if (error || !transaction) {
    throw new Error(
      `${ErrorCodes.TRANSACTION_NOT_FOUND}: Transaction not found`
    );
  }

  if (!transaction.escrow_release_at) {
    throw new Error(
      `${ErrorCodes.TRANSACTION_INVALID}: No escrow release date set`
    );
  }

  const releaseDate = new Date(transaction.escrow_release_at);
  const now = new Date();
  const delayMs = releaseDate.getTime() - now.getTime();

  if (delayMs <= 0) {
    // Already past release date, release immediately
    await releaseEscrow(transactionId);
    return;
  }

  // Push to Redis queue for delayed processing
  // Worker will check and process when ready
  await redisClient.rPush(
    "escrow_release",
    JSON.stringify({
      transaction_id: transactionId,
      scheduled_at: releaseDate.toISOString(),
    })
  );
}

/**
 * Cancel scheduled escrow release
 * Called when dispute is filed
 */
export async function cancelEscrowRelease(
  transactionId: string
): Promise<void> {
  await ensureRedis();
  await redisClient.del(`escrow:release:${transactionId}`);
}

/**
 * Release escrow funds to seller
 * Rule 3: ALWAYS use SQL RPC for wallet operations
 */
export async function releaseEscrow(transactionId: string): Promise<void> {
  // Use Supabase RPC for atomic operation
  // This ensures double-entry bookkeeping in wallet_logs
  const { data, error } = await supabase.rpc("release_escrow", {
    p_transaction_id: transactionId,
  });

  if (error) {
    throw new Error(`${ErrorCodes.TRANSACTION_FAILED}: ${error.message}`);
  }

  if (!data?.success) {
    throw new Error(
      `${ErrorCodes.ESCROW_ALREADY_RELEASED}: ${
        data?.error || "Failed to release escrow"
      }`
    );
  }
}

/**
 * Check if transaction has pending dispute
 */
export async function hasActiveDispute(
  transactionId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("disputes")
    .select("id")
    .eq("transaction_id", transactionId)
    .eq("status", "pending")
    .is("deleted_at", null) // Rule 3: Always filter deleted_at
    .single();

  return !!data;
}
