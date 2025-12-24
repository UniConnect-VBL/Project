/**
 * Data Cleanup Job - PDPD Compliance
 *
 * Rule 67: Cron job to Hard Delete verification_proofs (images on R2 & DB records) older than 30 days.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { DeleteObjectsCommand, S3Client } from "@aws-sdk/client-s3";

// Initialize R2 client (same as upload service)
const r2Client = process.env.R2_ENDPOINT
  ? new S3Client({
      region: "auto",
      endpoint: process.env.R2_ENDPOINT,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
      },
    })
  : null;

const R2_BUCKET = process.env.R2_BUCKET_NAME || "unihood";
const CLEANUP_DAYS = 30;

/**
 * Delete old verification proofs from R2 and database
 * Should be run as a daily cron job
 */
export async function cleanupVerificationProofs(
  supabase: SupabaseClient
): Promise<{ deletedCount: number; errors: string[] }> {
  const errors: string[] = [];
  let deletedCount = 0;

  // Calculate cutoff date (30 days ago)
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - CLEANUP_DAYS);
  const cutoffIso = cutoffDate.toISOString();

  console.log(
    `[Cleanup] Starting cleanup of verification_proofs older than ${cutoffIso}`
  );

  // Get old proofs
  const { data: oldProofs, error: fetchError } = await supabase
    .from("verification_proofs")
    .select("id, image_url")
    .lt("created_at", cutoffIso)
    .limit(100); // Process in batches

  if (fetchError) {
    errors.push(`Failed to fetch old proofs: ${fetchError.message}`);
    return { deletedCount, errors };
  }

  if (!oldProofs || oldProofs.length === 0) {
    console.log("[Cleanup] No old verification proofs found");
    return { deletedCount, errors };
  }

  console.log(`[Cleanup] Found ${oldProofs.length} proofs to delete`);

  // Extract R2 keys from URLs and delete from R2
  if (r2Client) {
    const keysToDelete: { Key: string }[] = [];

    for (const proof of oldProofs) {
      if (proof.image_url) {
        // Extract key from URL (format: https://bucket.r2.dev/key or similar)
        try {
          const url = new URL(proof.image_url);
          const key = url.pathname.startsWith("/")
            ? url.pathname.substring(1)
            : url.pathname;
          keysToDelete.push({ Key: key });
        } catch {
          errors.push(`Invalid URL for proof ${proof.id}: ${proof.image_url}`);
        }
      }
    }

    if (keysToDelete.length > 0) {
      try {
        const deleteCommand = new DeleteObjectsCommand({
          Bucket: R2_BUCKET,
          Delete: {
            Objects: keysToDelete,
            Quiet: true,
          },
        });

        await r2Client.send(deleteCommand);
        console.log(`[Cleanup] Deleted ${keysToDelete.length} files from R2`);
      } catch (r2Error) {
        const message =
          r2Error instanceof Error ? r2Error.message : String(r2Error);
        errors.push(`R2 deletion failed: ${message}`);
        // Continue with DB deletion even if R2 fails
      }
    }
  }

  // Delete from database (HARD DELETE as per PDPD)
  const proofIds = oldProofs.map((p) => p.id);
  const { error: deleteError } = await supabase
    .from("verification_proofs")
    .delete()
    .in("id", proofIds);

  if (deleteError) {
    errors.push(`Database deletion failed: ${deleteError.message}`);
  } else {
    deletedCount = proofIds.length;
    console.log(
      `[Cleanup] Hard deleted ${deletedCount} verification_proofs from database`
    );
  }

  return { deletedCount, errors };
}
