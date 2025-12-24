import { supabase } from "../utils/supabase.js";
import { ensureRedis, redisClient } from "../utils/redis.js";
import {
  createPresignedUploadUrl,
  getPublicUrl,
  isR2Configured,
} from "../utils/r2.js";
import type {
  VerificationProof,
  VerificationStatusResponse,
} from "@unihood/types";

const ALLOWED_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * Generate presigned upload URL for verification proof
 */
export async function getUploadUrl(
  userId: string,
  contentType: string
): Promise<{ upload_url: string; file_key: string; expires_in: number }> {
  // Validate content type
  if (!ALLOWED_CONTENT_TYPES.includes(contentType)) {
    throw new Error("Invalid file type. Only JPEG, PNG, WEBP allowed.");
  }

  if (!isR2Configured()) {
    throw new Error("File storage not configured");
  }

  const timestamp = Date.now();
  const extension = contentType.split("/")[1] || "jpg";
  const fileKey = `proofs/${userId}/${timestamp}.${extension}`;

  const { uploadUrl, fileKey: key } = await createPresignedUploadUrl({
    key: fileKey,
    contentType,
    expiresIn: 300, // 5 minutes
  });

  return {
    upload_url: uploadUrl,
    file_key: key,
    expires_in: 300,
  };
}

/**
 * Create verification proof record and queue for AI processing
 */
export async function submitVerificationProof(
  userId: string,
  imageUrl: string
): Promise<VerificationProof> {
  if (!supabase) {
    throw new Error("Database not configured");
  }

  // Check if user already has pending verification
  const { data: existing } = await supabase
    .from("verification_proofs")
    .select("id, status")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (existing && existing.status === "pending") {
    throw new Error("You already have a pending verification request");
  }

  // Create new verification proof
  const { data: proof, error } = await supabase
    .from("verification_proofs")
    .insert({
      user_id: userId,
      image_url: imageUrl,
      status: "pending",
    })
    .select()
    .single();

  if (error || !proof) {
    throw new Error(error?.message || "Failed to create verification proof");
  }

  // Update user verification status
  await supabase
    .from("users")
    .update({ verification_status: "pending" })
    .eq("id", userId);

  // Push to Redis queue for AI processing
  await enqueueVerification({
    user_id: userId,
    proof_id: proof.id,
    proof_url: imageUrl,
  });

  return proof as VerificationProof;
}

/**
 * Get current verification status for user
 */
export async function getVerificationStatus(
  userId: string
): Promise<VerificationStatusResponse> {
  if (!supabase) {
    throw new Error("Database not configured");
  }

  // Get user with school join
  const { data: user, error } = await supabase
    .from("users")
    .select(
      `
      verification_status,
      student_code,
      is_verified,
      schools (
        id,
        name,
        short_name,
        logo_url,
        total_trust_score,
        created_at
      )
    `
    )
    .eq("id", userId)
    .is("deleted_at", null)
    .single();

  if (error || !user) {
    throw new Error("User not found");
  }

  // Get latest proof for submitted_at and rejected_reason
  const { data: latestProof } = await supabase
    .from("verification_proofs")
    .select("created_at, rejected_reason, status")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  return {
    status: user.verification_status,
    student_code: user.student_code || undefined,
    school: user.schools
      ? Array.isArray(user.schools)
        ? user.schools[0]
        : user.schools
      : undefined,
    submitted_at: latestProof?.created_at || undefined,
    rejected_reason:
      latestProof?.status === "rejected"
        ? latestProof.rejected_reason
        : undefined,
  };
}

/**
 * Enqueue verification job for AI processing
 */
export async function enqueueVerification(payload: Record<string, unknown>) {
  await ensureRedis();
  await redisClient.rPush("verification", JSON.stringify(payload));
}

/**
 * Check if user can submit verification (rate limit check)
 */
export async function canSubmitVerification(userId: string): Promise<boolean> {
  if (!supabase) {
    return false;
  }

  // Count submissions in last hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { count } = await supabase
    .from("verification_proofs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", oneHourAgo);

  return (count || 0) < 5; // Max 5 submissions per hour
}
