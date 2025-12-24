import { Router } from "express";
import {
  createJob,
  getJobs,
  applyToJob,
  getMyApplications,
} from "../controllers/jobs.controller.js";
import {
  requireRecruiter,
  requireVerified,
  authorize,
} from "../middlewares/roles.js";

const router = Router();

// Create job (recruiter only - requires Tier 1 verification)
router.post("/", requireRecruiter, createJob);

// List jobs (public - no auth required)
router.get("/", getJobs);

// Apply to job (verified students only - Tier 1)
router.post("/apply", authorize(1, ["student"]), applyToJob);

// Get my applications (requires verification)
router.get("/applications", requireVerified, getMyApplications);

export default router;
