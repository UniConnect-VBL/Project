import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.js";
import {
  handleGoogleAuth,
  handleGetMe,
} from "../controllers/auth.controller.js";
import type { AuthedRequest } from "../middlewares/auth.js";

const router = Router();

/**
 * POST /auth/google
 * Exchange authorization code for JWT session
 */
router.post("/google", handleGoogleAuth);

/**
 * GET /auth/me
 * Get current user profile with school info, create profile if not exists
 * Protected: Requires JWT token
 */
router.get("/me", authMiddleware, handleGetMe);

export default router;
