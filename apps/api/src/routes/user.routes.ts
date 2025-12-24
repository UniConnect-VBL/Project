/**
 * User Routes - Self-Service Features
 *
 * Handles user-facing endpoints including:
 * - Data deletion (Nuke feature - Rule 94)
 */

import { Router } from "express";
import { nukeMyData, requestMyNuke } from "../controllers/user.controller.js";
import { authMiddleware } from "../middlewares/auth.js";

const router = Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * POST /api/users/me/nuke
 * Permanently delete all user data (PDPD compliance)
 * Body: { confirm: "DELETE_ALL_MY_DATA", reason?: string }
 */
router.post("/me/nuke", nukeMyData);

/**
 * POST /api/users/me/nuke-request
 * Request admin approval for data deletion
 * Body: { reason?: string }
 */
router.post("/me/nuke-request", requestMyNuke);

export default router;
