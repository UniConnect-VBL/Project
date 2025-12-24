import { Router } from "express";
import {
  createStream,
  getLiveStreams,
  donateToStream,
  endStream,
} from "../controllers/streams.controller.js";

const router = Router();

// Create stream
router.post("/create", createStream);

// Get live streams
router.get("/live", getLiveStreams);

// Donate to stream
router.post("/donate", donateToStream);

// End stream
router.put("/:id/end", endStream);

export default router;
