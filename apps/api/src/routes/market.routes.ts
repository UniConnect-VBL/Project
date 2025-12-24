import { Router } from "express";
import {
  createMaterial,
  getMaterials,
  purchaseMaterial,
} from "../controllers/marketplace.controller.js";
import { requireIdempotency } from "../middlewares/idempotency.js";

const router = Router();

// Create material (upload for sale)
router.post("/materials", createMaterial);

// List/search materials
router.get("/", getMaterials);

// Purchase material (with escrow) - MUST use idempotency (Rule 7)
router.post("/purchase", requireIdempotency, purchaseMaterial);

export default router;
