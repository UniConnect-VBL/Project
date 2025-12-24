import { Request, Response } from "express";
import { supabase } from "../utils/supabase.js";
import {
  getPendingDisputes,
  resolveDispute as resolveDisputeService,
} from "../services/dispute.service.js";
import { getAuditLogs } from "../services/audit.service.js";
import {
  createSuccessResponse,
  createErrorResponse,
  ApproveContentRequest,
  ErrorCodes,
} from "@unihood/types";
import { redisClient } from "../utils/redis.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import type { AuthedRequest } from "../middlewares/auth.js";

/**
 * Get pending content for moderation
 * Rule 5.67: Use asyncHandler wrapper
 */
export const getPendingContent = asyncHandler(
  async (req: Request, res: Response) => {
    const items = [];

    // Get pending posts
    const { data: posts } = await supabase!
      .from("posts")
      .select("*")
      .eq("ai_status", "pending")
      .is("deleted_at", null)
      .limit(50);

    if (posts) {
      items.push(...posts.map((p) => ({ type: "post", ...p })));
    }

    // Get pending materials
    const { data: materials } = await supabase!
      .from("materials")
      .select("*")
      .eq("ai_status", "pending")
      .is("deleted_at", null)
      .limit(50);

    if (materials) {
      items.push(...materials.map((m) => ({ type: "material", ...m })));
    }

    res.json(createSuccessResponse(items));
  }
);

/**
 * Approve or reject content
 * Rule 5.67: Use asyncHandler wrapper
 */
export const approveContent = asyncHandler(
  async (req: Request, res: Response) => {
    const adminId = (req as AuthedRequest).user?.id;
    const { id } = req.params;
    const { status, type }: ApproveContentRequest = req.body;

    if (!type || (type !== "post" && type !== "material")) {
      res
        .status(400)
        .json(
          createErrorResponse(ErrorCodes.VALIDATION_REQUIRED, "Invalid type")
        );
      return;
    }

    const table = type === "post" ? "posts" : "materials";

    const { data, error } = await supabase!
      .from(table)
      .update({ ai_status: status })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    // Create notification
    const { data: item } = await supabase!
      .from(table)
      .select("user_id")
      .eq("id", id)
      .single();

    if (item) {
      await supabase!.from("notifications").insert({
        user_id: item.user_id,
        actor_id: adminId,
        type: `${type}_${status}`,
        title: `Your ${type} has been ${status}`,
        content: `Your ${type} (ID: ${id}) has been ${status} by an admin.`,
      });
    }

    res.json(createSuccessResponse(data));
  }
);

/**
 * Get pending disputes for admin review
 * Rule 5.67: Use asyncHandler wrapper
 */
export const getAdminPendingDisputes = asyncHandler(
  async (req: Request, res: Response) => {
    const disputes = await getPendingDisputes();
    res.json(createSuccessResponse(disputes));
  }
);

/**
 * Resolve a dispute
 * Rule 5.67: Use asyncHandler wrapper
 */
export const resolveDispute = asyncHandler(
  async (req: Request, res: Response) => {
    const adminId = (req as AuthedRequest).user?.id;
    const { id } = req.params;
    const { status } = req.body;

    if (status !== "resolved_refund" && status !== "resolved_reject") {
      res
        .status(400)
        .json(
          createErrorResponse(ErrorCodes.VALIDATION_REQUIRED, "Invalid status")
        );
      return;
    }

    if (!adminId) {
      res
        .status(401)
        .json(
          createErrorResponse(ErrorCodes.AUTH_UNAUTHORIZED, "Unauthorized")
        );
      return;
    }

    const dispute = await resolveDisputeService(id, status, adminId);

    // Create notifications
    const { data: transaction } = await supabase!
      .from("transactions")
      .select("buyer_id, seller_id")
      .eq("id", dispute.transaction_id)
      .single();

    if (transaction) {
      await supabase!.from("notifications").insert([
        {
          user_id: transaction.buyer_id,
          actor_id: adminId,
          type: "dispute_resolved",
          title: "Dispute resolved",
          content: `Your dispute has been resolved: ${status}`,
        },
        {
          user_id: transaction.seller_id,
          actor_id: adminId,
          type: "dispute_resolved",
          title: "Dispute resolved",
          content: `A dispute on your transaction has been resolved: ${status}`,
        },
      ]);
    }

    res.json(createSuccessResponse(dispute));
  }
);

/**
 * Get audit logs
 * Rule 5.67: Use asyncHandler wrapper
 */
export const getAdminAuditLogs = asyncHandler(
  async (req: Request, res: Response) => {
    const { action, limit = 50 } = req.query;
    const logs = await getAuditLogs({
      action: action as string,
      limit: Number(limit),
    });
    res.json(createSuccessResponse(logs));
  }
);
