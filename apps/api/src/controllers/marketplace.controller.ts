import { Request, Response } from "express";
import { supabase } from "../utils/supabase.js";
import { redisClient } from "../utils/redis.js";
import { executePurchase } from "../services/purchase.service.js";
import { Material, CreateMaterialRequest } from "@unihood/types";
import {
  createSuccessResponse,
  createErrorResponse,
  ErrorCodes,
} from "@unihood/types";
import { asyncHandler } from "../utils/asyncHandler.js";
import type { AuthedRequest } from "../middlewares/auth.js";

/**
 * Create a new material listing
 * Rule 5.67: Use asyncHandler wrapper
 */
export const createMaterial = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = (req as AuthedRequest).user?.id;
    if (!userId) {
      res
        .status(401)
        .json(
          createErrorResponse(ErrorCodes.AUTH_UNAUTHORIZED, "Unauthorized")
        );
      return;
    }

    const data: CreateMaterialRequest = req.body;

    if (!data.title || !data.price || !data.type) {
      res
        .status(400)
        .json(
          createErrorResponse(
            ErrorCodes.VALIDATION_REQUIRED,
            "Missing required fields"
          )
        );
      return;
    }

    const { data: material, error } = await supabase!
      .from("materials")
      .insert({
        user_id: userId,
        title: data.title,
        description: data.description,
        price: data.price,
        type: data.type,
        file_key: data.file_key,
        thumbnail_url: data.thumbnail_url,
        school_filter: data.school_filter,
        ai_status: "pending",
      })
      .select()
      .single();

    if (error) throw error;

    // Dispatch moderation and embedding jobs
    if (redisClient) {
      await redisClient.lPush(
        "moderation",
        JSON.stringify({
          type: "material",
          material_id: material.id,
          content: `${data.title} ${data.description || ""}`,
        })
      );

      await redisClient.lPush(
        "recommendation",
        JSON.stringify({
          type: "material_embedding",
          material_id: material.id,
          content: `${data.title} ${data.description || ""}`,
        })
      );
    }

    res.json(createSuccessResponse(material));
  }
);

/**
 * Get materials list
 * Rule 5.67: Use asyncHandler wrapper
 */
export const getMaterials = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = (req as AuthedRequest).user?.id;
    if (!userId) {
      res
        .status(401)
        .json(
          createErrorResponse(ErrorCodes.AUTH_UNAUTHORIZED, "Unauthorized")
        );
      return;
    }

    const { search, filter, limit = 20 } = req.query;

    let query = supabase!
      .from("materials")
      .select("*")
      .eq("ai_status", "approved")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(Number(limit));

    if (filter) {
      query = query.eq("school_filter", filter as string);
    }

    // TODO: Add AI search via embeddings if search query provided

    const { data, error } = await query;

    if (error) throw error;
    res.json(createSuccessResponse(data || []));
  }
);

/**
 * Purchase a material
 * Rule 5.67: Use asyncHandler wrapper
 */
export const purchaseMaterial = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = (req as AuthedRequest).user?.id;
    if (!userId) {
      res
        .status(401)
        .json(
          createErrorResponse(ErrorCodes.AUTH_UNAUTHORIZED, "Unauthorized")
        );
      return;
    }

    const { material_id } = req.body;

    if (!material_id) {
      res
        .status(400)
        .json(
          createErrorResponse(
            ErrorCodes.VALIDATION_REQUIRED,
            "material_id is required"
          )
        );
      return;
    }

    const transaction = await executePurchase(material_id, userId);

    // Get signed URL for file
    const { data: material } = await supabase!
      .from("materials")
      .select("file_key")
      .eq("id", material_id)
      .single();

    // TODO: Generate R2 signed URL for file_key

    res.json(
      createSuccessResponse({
        transaction,
        file_url: material?.file_key, // TODO: Replace with signed URL
        escrow_release_at: transaction.escrow_release_at,
      })
    );
  }
);
