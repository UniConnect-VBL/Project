/**
 * Cloudflare R2 Storage Configuration
 * Uses validated env from env.ts
 * R2 is optional - functions will throw if not configured
 */
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "../env.js";

// Allowed content types for verification proofs
const ALLOWED_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp"];

// Initialize S3 client for R2 (only if all required env vars are present)
const r2Client =
  env.R2_ACCOUNT_ID && env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY
    ? new S3Client({
        region: "auto",
        endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: env.R2_ACCESS_KEY_ID,
          secretAccessKey: env.R2_SECRET_ACCESS_KEY,
        },
      })
    : null;

export interface PresignedUrlOptions {
  key: string;
  contentType: string;
  expiresIn?: number; // seconds, default 300 (5 min)
}

/**
 * Generate a presigned PUT URL for uploading files to R2
 */
export async function createPresignedUploadUrl(
  options: PresignedUrlOptions
): Promise<{ uploadUrl: string; fileKey: string }> {
  if (!r2Client) {
    throw new Error(
      "R2 client not configured. Check R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY."
    );
  }

  // Validate content type
  if (!ALLOWED_CONTENT_TYPES.includes(options.contentType)) {
    throw new Error(
      `Invalid content type. Allowed: ${ALLOWED_CONTENT_TYPES.join(", ")}`
    );
  }

  const command = new PutObjectCommand({
    Bucket: env.R2_BUCKET_NAME,
    Key: options.key,
    ContentType: options.contentType,
  });

  const uploadUrl = await getSignedUrl(r2Client, command, {
    expiresIn: options.expiresIn || 300,
  });

  return {
    uploadUrl,
    fileKey: options.key,
  };
}

/**
 * Generate a presigned GET URL for downloading files from R2
 * Rule 7: Signed URLs must have short TTL (60s default)
 */
export async function createPresignedDownloadUrl(
  key: string,
  expiresIn = 60
): Promise<string> {
  if (!r2Client) {
    throw new Error(
      "R2 client not configured. Check R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY."
    );
  }

  const command = new GetObjectCommand({
    Bucket: env.R2_BUCKET_NAME,
    Key: key,
  });

  return getSignedUrl(r2Client, command, { expiresIn });
}

/**
 * Get public URL for displaying uploaded files
 */
export function getPublicUrl(key: string): string {
  if (env.R2_PUBLIC_DOMAIN) {
    return `${env.R2_PUBLIC_DOMAIN}/${key}`;
  }
  // Fallback to R2 public access if configured
  return `https://${env.R2_BUCKET_NAME}.${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${key}`;
}

export function isR2Configured(): boolean {
  return r2Client !== null;
}
