import { Router } from "express";
import { getSchoolsLeaderboard } from "../services/leaderboard.service.js";
import type { AuthedRequest } from "../middlewares/auth.js";

const router = Router();

/**
 * GET /schools/leaderboard
 * Get schools leaderboard sorted by total_trust_score descending
 */
router.get("/leaderboard", async (req: AuthedRequest, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const schools = await getSchoolsLeaderboard(limit);
    res.json({ schools });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch leaderboard";
    res.status(500).json({ error: message });
  }
});

export default router;

