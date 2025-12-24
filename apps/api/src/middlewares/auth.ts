import { Request, Response, NextFunction } from "express";
import { createClient } from "@supabase/supabase-js";
import { supabase as supabaseService } from "../utils/supabase.js";
import { ErrorCodes, type UserRole } from "@unihood/types";
import { env } from "../env.js";

export interface AuthedRequest extends Request {
  user?: {
    id: string;
    email: string;
    is_verified: boolean;
    school_id: string | null;
    trust_score: number;
    role: UserRole;
    is_premium?: boolean;
  };
}

// Create anon client for token verification (validated by env.ts)
const supabaseAnon = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);

/**
 * Auth Middleware - Rule 5: Verify Supabase JWT
 * Attaches user (id, is_verified, school_id, trust_score, role) to req
 */
export async function authMiddleware(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;

  // Rule 8: Use ErrorCodes, not plain text
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      code: ErrorCodes.AUTH_NO_TOKEN,
      error: "Authorization header missing or malformed",
    });
  }

  const token = authHeader.split(" ")[1];

  const { data, error } = await supabaseAnon.auth.getUser(token);
  if (error || !data.user) {
    return res.status(401).json({
      success: false,
      code: ErrorCodes.AUTH_INVALID_TOKEN,
      error: "Invalid or expired token",
    });
  }

  // Fetch full profile with role (Rule: ALWAYS filter deleted_at IS NULL)

  const { data: profile, error: profileErr } = await supabaseService
    .from("profiles")
    .select("id, email, is_verified, school_id, trust_score, role, is_premium")
    .eq("id", data.user.id)
    .is("deleted_at", null)
    .single();

  if (profileErr || !profile) {
    return res.status(404).json({
      success: false,
      code: ErrorCodes.PROFILE_NOT_FOUND,
      error: "User profile not found",
    });
  }

  // Attach full user info to req (including role for authorization)
  req.user = {
    id: profile.id,
    email: profile.email ?? data.user.email ?? "",
    is_verified: profile.is_verified ?? false,
    school_id: profile.school_id ?? null,
    trust_score: profile.trust_score ?? 10,
    role: profile.role ?? "student",
    is_premium: profile.is_premium ?? false,
  };

  next();
}
