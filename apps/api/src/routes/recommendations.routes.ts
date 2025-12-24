import { Router } from "express";
import { getRecommendations } from "../controllers/recommendations.controller.js";

const router = Router();

// Get AI recommendations (premium only)
router.get("/", getRecommendations);

export default router;
