import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  handleGetStatus,
  handleGetUploadUrl,
  handleSubmitProof,
} from "../controllers/verification.controller.js";

const router = Router();

// Rate limit for upload URL generation (5 requests per hour)
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 requests per hour
  message: { error: "Too many upload requests, try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * GET /verify/status
 * Get current user's verification status
 */
router.get("/status", handleGetStatus);

/**
 * POST /verify/upload-url
 * Generate presigned URL for uploading verification proof image
 * Rate limited: 5 requests per hour
 */
router.post("/upload-url", uploadLimiter, handleGetUploadUrl);

/**
 * POST /verify/submit
 * Submit verification proof for AI OCR processing
 */
router.post("/submit", handleSubmitProof);

export default router;
