import type { Response } from "express";
import type { AuthedRequest } from "../middlewares/auth.js";
import {
  getUploadUrl,
  submitVerificationProof,
  getVerificationStatus,
  canSubmitVerification,
} from "../services/verify.service.js";
import { createConsentLog } from "../services/consent.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";

/**
 * GET /verify/status
 * Get current user's verification status
 * Rule 5.67: Use asyncHandler wrapper
 */
export const handleGetStatus = asyncHandler<AuthedRequest>(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const status = await getVerificationStatus(userId);
  res.json(status);
});

/**
 * POST /verify/upload-url
 * Generate presigned URL for uploading verification proof
 * Rule 5.67: Use asyncHandler wrapper
 */
export const handleGetUploadUrl = asyncHandler<AuthedRequest>(
  async (req, res) => {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { content_type } = req.body;
    if (!content_type) {
      res.status(400).json({ error: "content_type is required" });
      return;
    }

    // Check rate limit
    const canSubmit = await canSubmitVerification(userId);
    if (!canSubmit) {
      res.status(429).json({
        error: "Too many upload requests. Try again later.",
      });
      return;
    }

    const result = await getUploadUrl(userId, content_type);
    res.json(result);
  }
);

/**
 * POST /verify/submit
 * Submit verification proof for AI processing
 * Rule 5.67: Use asyncHandler wrapper
 */
export const handleSubmitProof = asyncHandler<AuthedRequest>(
  async (req, res) => {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { image_url } = req.body;
    if (!image_url) {
      res.status(400).json({ error: "image_url is required" });
      return;
    }

    // Log consent for verification
    await createConsentLog(
      userId,
      "verification",
      "v1.0",
      req.ip,
      req.get("user-agent"),
      { action: "submit_verification_proof" }
    );

    const proof = await submitVerificationProof(userId, image_url);

    res.json({
      success: true,
      proof_id: proof.id,
      status: proof.status,
      message: "Verification submitted. Processing will take a few minutes.",
    });
  }
);
