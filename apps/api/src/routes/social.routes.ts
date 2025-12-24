import { Router } from "express";
import {
  createPost,
  getFeed,
  likePost,
  commentPost,
} from "../services/social.service.js";
import { getSupabaseService } from "../utils/supabase.js";
import { ensureRedis, redisClient } from "../utils/redis.js";
import { insertNotification } from "../services/notification.service.js";
import type { AuthedRequest } from "../middlewares/auth.js";

const router = Router();

/**
 * POST /posts
 * Create post (guest OK for basic, verified for advanced)
 */
router.post("/", async (req: AuthedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { content, media_urls = [], visibility = "school" } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: "Content cannot be empty" });
    }

    const post = await createPost(userId, content, media_urls, visibility);
    res.json({ post });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create post";
    res.status(500).json({ error: message });
  }
});

/**
 * GET /feed
 * Get feed with cursor pagination and visibility filtering
 */
router.get("/feed", async (req: AuthedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const cursor = req.query.cursor as string | undefined;
    const id = req.query.id as string | undefined;
    const schoolId = req.query.school_id as string | undefined;
    const limit = parseInt(req.query.limit as string) || 20;

    // Parse cursor if provided
    let parsedCursor: string | undefined;
    let parsedId: string | undefined;
    if (cursor) {
      const parts = cursor.split("&next_id=");
      parsedCursor = parts[0];
      parsedId = parts[1] || id;
    }

    const result = await getFeed({
      cursor: parsedCursor,
      id: parsedId,
      school_id: schoolId,
      limit,
      viewer_id: userId,
      viewer_school_id: req.user?.school_id ?? undefined,
    });

    res.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch feed";
    res.status(500).json({ error: message });
  }
});

/**
 * POST /likes
 * Like a post (guest OK)
 */
router.post("/likes", async (req: AuthedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { post_id } = req.body;
    if (!post_id) {
      return res.status(400).json({ error: "post_id is required" });
    }

    const like = await likePost(post_id, userId);
    res.json({ like });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to like post";
    const status = message.includes("already liked")
      ? 400
      : message.includes("not found")
      ? 404
      : 500;
    res.status(status).json({ error: message });
  }
});

/**
 * POST /comments
 * Comment on a post (guest OK)
 */
router.post("/comments", async (req: AuthedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { post_id, content } = req.body;
    if (!post_id || !content) {
      return res
        .status(400)
        .json({ error: "post_id and content are required" });
    }

    const comment = await commentPost(post_id, userId, content);
    res.json({ comment });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create comment";
    const status = message.includes("empty")
      ? 400
      : message.includes("not found")
      ? 404
      : 500;
    res.status(status).json({ error: message });
  }
});

/**
 * POST /reports
 * Report content (guest OK)
 */
router.post("/reports", async (req: AuthedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { target_id, target_type, reason } = req.body;
    if (!target_id || !target_type || !reason) {
      return res
        .status(400)
        .json({ error: "target_id, target_type, and reason are required" });
    }

    const validTypes = ["post", "product", "review"];
    if (!validTypes.includes(target_type)) {
      return res
        .status(400)
        .json({
          error: `target_type must be one of: ${validTypes.join(", ")}`,
        });
    }

    const supabase = getSupabaseService();
    if (!supabase) {
      return res.status(500).json({ error: "Database not configured" });
    }

    const { data: report, error } = await supabase
      .from("reports")
      .insert({
        reporter_id: userId,
        target_id,
        target_type,
        reason,
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create report: ${error.message}`);
    }

    // Push to moderation queue if needed
    await ensureRedis();
    await redisClient.rPush(
      "moderation",
      JSON.stringify({
        type: "report",
        report_id: report.id,
        target_id,
        target_type,
        reason,
      })
    );

    // Notify admin
    await insertNotification({
      user_id: userId, // Admin user_id - you may need to fetch admin IDs
      actor_id: userId,
      type: "admin_report",
      title: "New report",
      content: `Report submitted for ${target_type}`,
      metadata: { report_id: report.id, target_id, target_type },
    });

    res.json({ report });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create report";
    res.status(500).json({ error: message });
  }
});

export default router;
