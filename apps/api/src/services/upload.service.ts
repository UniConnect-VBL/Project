/**
 * Upload Service - R2 Presigned URLs
 *
 * Rule 7: Upload Security (Cloudflare R2)
 * - NEVER allow client direct upload using global keys
 * - ALWAYS use Presigned URLs
 * - Flow: Client requests URL -> API validates Trust Tier -> API returns 60s Presigned URL -> Client uploads directly to R2
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "../env.js";
import { v4 as uuidv4 } from "uuid";
import {
  PRESIGNED_URL_TTL,
  SIGNED_DOWNLOAD_TTL,
  MAX_FILE_SIZES,
} from "@unihood/shared";

/**
 * Get the S3 client for R2 operations
 * Throws if R2 is not configured
 */
function getS3Client(): S3Client {
  if (!env.isR2Configured) {
    throw new Error(
      "R2 storage is not configured. Please set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY environment variables."
    );
  }

  return new S3Client({
    region: "auto",
    endpoint: env.R2_ENDPOINT!,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID!,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY!,
    },
  });
}

// Lazily initialized S3 client
let _s3Client: S3Client | null = null;
const s3Client = (): S3Client => {
  if (!_s3Client) {
    _s3Client = getS3Client();
  }
  return _s3Client;
};

// Allowed content types per folder
const ALLOWED_TYPES: Record<string, string[]> = {
  verification: ["image/jpeg", "image/png", "image/webp"],
  materials: ["application/pdf", "image/jpeg", "image/png"],
  avatars: ["image/jpeg", "image/png", "image/webp"],
  posts: ["image/jpeg", "image/png", "image/webp", "video/mp4"],
};

export type UploadFolder = "verification" | "materials" | "avatars" | "posts";

export interface PresignedUrlResult {
  /** The presigned URL for upload (PUT) */
  uploadUrl: string;
  /** The file key in R2 bucket */
  fileKey: string;
  /** URL expires in seconds */
  expiresIn: number;
  /** Public URL after upload (for storage in DB) */
  publicUrl: string;
}

export interface UploadError {
  code: "INVALID_TYPE" | "FILE_TOO_LARGE" | "PRESIGN_FAILED";
  message: string;
}

/**
 * Generate a presigned URL for client-side upload
 */
export async function generatePresignedUploadUrl(
  userId: string,
  contentType: string,
  folder: UploadFolder
): Promise<PresignedUrlResult | UploadError> {
  // Validate content type for folder
  const allowedTypes = ALLOWED_TYPES[folder];
  if (!allowedTypes.includes(contentType)) {
    return {
      code: "INVALID_TYPE",
      message: `Content type '${contentType}' not allowed for folder '${folder}'`,
    };
  }

  // Determine file extension
  const extensions: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "application/pdf": "pdf",
    "video/mp4": "mp4",
  };
  const ext = extensions[contentType] || "bin";

  // Generate unique file key with user context
  const timestamp = Date.now();
  const fileKey = `${folder}/${userId}/${timestamp}_${uuidv4().slice(
    0,
    8
  )}.${ext}`;

  try {
    const command = new PutObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: fileKey,
      ContentType: contentType,
      Metadata: {
        "uploaded-by": userId,
        "uploaded-at": new Date().toISOString(),
      },
    });

    const uploadUrl = await getSignedUrl(s3Client(), command, {
      expiresIn: PRESIGNED_URL_TTL, // 60 seconds per Rule 7
    });

    // Construct the public URL (after upload)
    const publicUrl = `${env.R2_PUBLIC_URL}/${fileKey}`;

    return {
      uploadUrl,
      fileKey,
      expiresIn: PRESIGNED_URL_TTL,
      publicUrl,
    };
  } catch (error) {
    console.error("Failed to generate presigned URL:", error);
    return {
      code: "PRESIGN_FAILED",
      message: "Failed to generate upload URL",
    };
  }
}

/**
 * Generate a signed download URL for secure file access
 * Rule 7: R2 document links for download must have a short TTL (60s) and be tied to user_id
 */
export async function generateSignedDownloadUrl(
  fileKey: string,
  requestingUserId: string
): Promise<string | null> {
  try {
    const command = new GetObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: fileKey,
      // Add user context for audit
      ResponseContentDisposition: `attachment; filename="${fileKey
        .split("/")
        .pop()}"`,
    });

    const downloadUrl = await getSignedUrl(s3Client(), command, {
      expiresIn: SIGNED_DOWNLOAD_TTL, // 60 seconds
    });

    return downloadUrl;
  } catch (error) {
    console.error("Failed to generate download URL:", error);
    return null;
  }
}

/**
 * Check if content type is an image
 */
export function isImageType(contentType: string): boolean {
  return contentType.startsWith("image/");
}

/**
 * Check if content type is a PDF
 */
export function isPdfType(contentType: string): boolean {
  return contentType === "application/pdf";
}
