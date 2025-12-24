/**
 * Dead Letter Queue (DLQ) Service
 *
 * Rule 61: Failed jobs after 5 retries MUST be moved to DLQ for manual admin inspection.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export interface DLQEntry {
  queue_name: string;
  payload: Record<string, unknown>;
  error_message: string;
  retry_count: number;
}

/**
 * Push a failed job to the Dead Letter Queue
 */
export async function pushToDLQ(
  supabase: SupabaseClient,
  entry: DLQEntry
): Promise<void> {
  const { error } = await supabase.from("dead_letter_queue").insert({
    queue_name: entry.queue_name,
    payload: entry.payload,
    error_message: entry.error_message,
    retry_count: entry.retry_count,
  });

  if (error) {
    console.error("Failed to push to DLQ:", error.message);
  } else {
    console.log(`[DLQ] Job moved to dead_letter_queue: ${entry.queue_name}`);
  }
}

/**
 * Get DLQ entries for admin inspection
 */
export async function getDLQEntries(
  supabase: SupabaseClient,
  queueName?: string,
  limit: number = 50
): Promise<DLQEntry[]> {
  let query = supabase
    .from("dead_letter_queue")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (queueName) {
    query = query.eq("queue_name", queueName);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Failed to get DLQ entries:", error.message);
    return [];
  }

  return data || [];
}

/**
 * Remove a DLQ entry after manual resolution
 */
export async function removeDLQEntry(
  supabase: SupabaseClient,
  entryId: string
): Promise<boolean> {
  const { error } = await supabase
    .from("dead_letter_queue")
    .delete()
    .eq("id", entryId);

  if (error) {
    console.error("Failed to remove DLQ entry:", error.message);
    return false;
  }

  return true;
}

/**
 * Retry a DLQ entry by re-queuing it
 */
export async function retryDLQEntry(
  supabase: SupabaseClient,
  entryId: string,
  redis: { rPush: (key: string, value: string) => Promise<number> }
): Promise<boolean> {
  const { data, error } = await supabase
    .from("dead_letter_queue")
    .select("*")
    .eq("id", entryId)
    .single();

  if (error || !data) {
    console.error("DLQ entry not found:", error?.message);
    return false;
  }

  // Re-queue the job
  await redis.rPush(data.queue_name, JSON.stringify(data.payload));

  // Remove from DLQ
  await removeDLQEntry(supabase, entryId);

  console.log(`[DLQ] Re-queued job to ${data.queue_name}`);
  return true;
}
