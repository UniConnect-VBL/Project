import { Router } from "express";
import { softDeleteItem } from "../services/social.service.js";
import type { AuthedRequest } from "../middlewares/auth.js";

const router = Router();

/**
 * PUT /delete/:type/:id
 * Soft delete item (post/product/review/message)
 * Auth: owner or admin
 */
router.put("/:type/:id", async (req: AuthedRequest, res) => {
  try {
    const { type, id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const validTypes = ["post", "product", "review", "message"];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: `Invalid type. Must be one of: ${validTypes.join(", ")}` });
    }

    // Check if user is admin (you can add role check here)
    const isAdmin = req.user?.role === "admin";

    await softDeleteItem(type as "post" | "product" | "review" | "message", id, userId, isAdmin);

    res.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete item";
    const status = message.includes("not found") ? 404 : message.includes("Not authorized") ? 403 : 500;
    res.status(status).json({ error: message });
  }
});

export default router;

