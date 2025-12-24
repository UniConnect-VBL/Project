import { Router } from "express";
import {
  getPendingContent,
  approveContent,
  getAdminPendingDisputes,
  resolveDispute,
  getAdminAuditLogs,
} from "../controllers/admin.controller.js";
import { requireAdmin } from "../middlewares/roles.js";
import { auditMiddleware } from "../middlewares/audit.js";

const router = Router();

// All admin routes require admin role
router.use(requireAdmin);

// Get pending content for moderation
router.get("/pending", getPendingContent);

// Approve/reject content
router.put("/approve/:id", auditMiddleware, approveContent);

// Get pending disputes
router.get("/disputes", getAdminPendingDisputes);

// Resolve dispute
router.put("/resolve-dispute/:id", auditMiddleware, resolveDispute);

// Get audit logs
router.get("/audit-logs", getAdminAuditLogs);

export default router;
