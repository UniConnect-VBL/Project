import { Router } from "express";
import {
  createDispute,
  getMyDisputes,
} from "../controllers/disputes.controller.js";
import { requireVerified } from "../middlewares/roles.js";

const router = Router();

// Create dispute (requires verification - involved in a transaction)
router.post("/", requireVerified, createDispute);

// Get my disputes
router.get("/", requireVerified, getMyDisputes);

export default router;
