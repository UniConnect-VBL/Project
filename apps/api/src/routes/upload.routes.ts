/**
 * Upload Routes - R2 Presigned URL Endpoints
 *
 * Rule 7: Upload Security Flow
 * 1. Frontend gửi request GET /api/uploads/presigned-url?contentType=xyz&folder=abc
 * 2. API check quyền (Verified user mới được upload tài liệu)
 * 3. API trả về URL tạm của Cloudflare R2
 * 4. Frontend dùng URL đó để PUT file lên
 */

import { Router, Request, Response } from "express";
import { authMiddleware } from "../middlewares/auth.js";
import { requireVerified, requireTier2 } from "../middlewares/tierGuard.js";
import {
  generatePresignedUploadUrl,
  UploadFolder,
} from "../services/upload.service.js";
import {
  createSuccessResponse,
  createErrorResponse,
  ErrorCodes,
} from "@unihood/types";
import { PresignedUrlSchema } from "@unihood/shared";
import { z } from "zod";

const router = Router();

/**
 * GET /api/uploads/presigned-url
 *
 * Query params:
 * - contentType: MIME type of file (e.g., 'image/png')
 * - folder: Target folder ('verification' | 'materials' | 'avatars' | 'posts')
 *
 * Access control by folder:
 * - verification: Requires auth
 * - materials: Requires Tier 2 (verified + trust_score >= 60)
 * - avatars: Requires auth
 * - posts: Requires verified
 */
router.get(
  "/presigned-url",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      // Validate query params
      const parsed = PresignedUrlSchema.safeParse({
        content_type: req.query.contentType,
        folder: req.query.folder,
      });

      if (!parsed.success) {
        return res
          .status(400)
          .json(
            createErrorResponse(
              ErrorCodes.VALIDATION_INVALID_VALUE,
              parsed.error.errors.map((e) => e.message).join(", ")
            )
          );
      }

      const { content_type, folder } = parsed.data;

      // Additional tier checks based on folder
      if (
        folder === "materials" &&
        (!req.user!.is_verified || req.user!.trust_score < 60)
      ) {
        return res
          .status(403)
          .json(
            createErrorResponse(
              ErrorCodes.PERMISSION_TIER_TOO_LOW,
              "Marketplace upload requires Tier 2 (trust score >= 60)"
            )
          );
      }

      if (
        (folder === "posts" || folder === "verification") &&
        !req.user!.is_verified
      ) {
        // Allow verification upload for unverified users (that's how they get verified)
        if (folder !== "verification") {
          return res
            .status(403)
            .json(
              createErrorResponse(
                ErrorCodes.PERMISSION_VERIFICATION_REQUIRED,
                "Post upload requires verified account"
              )
            );
        }
      }

      // Generate presigned URL
      const result = await generatePresignedUploadUrl(
        req.user!.id,
        content_type,
        folder as UploadFolder
      );

      // Check for error
      if ("code" in result) {
        const errorMap: Record<string, ErrorCodes> = {
          INVALID_TYPE: ErrorCodes.UPLOAD_INVALID_TYPE,
          FILE_TOO_LARGE: ErrorCodes.UPLOAD_FILE_TOO_LARGE,
          PRESIGN_FAILED: ErrorCodes.UPLOAD_PRESIGN_FAILED,
        };
        return res
          .status(400)
          .json(createErrorResponse(errorMap[result.code], result.message));
      }

      // Return presigned URL data
      res.json(
        createSuccessResponse({
          upload_url: result.uploadUrl,
          file_key: result.fileKey,
          public_url: result.publicUrl,
          expires_in: result.expiresIn,
        })
      );
    } catch (error) {
      console.error("Upload presign error:", error);
      res
        .status(500)
        .json(
          createErrorResponse(
            ErrorCodes.INTERNAL_ERROR,
            "Failed to generate upload URL"
          )
        );
    }
  }
);

export default router;
