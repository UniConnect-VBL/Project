/**
 * TierGuard Middleware - Trust Score Access Control
 *
 * Rule 4: Gradual Trust & Verification Logic
 * - Tier 0 (Guest): Read-only feed, like/comment restricted
 * - Tier 1 (Verified): Full social features (post, comment, chat)
 * - Tier 2 (Trust Score > 60): Access Marketplace (Sell documents)
 * - Tier 3 (Trust Score > 80): Access Streaming & Anonymous Reviews
 */

import { Request, Response, NextFunction } from "express";
import { ErrorCodes, createErrorResponse } from "@unihood/types";
import { TRUST_TIERS, getUserTier } from "@unihood/shared";

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        is_verified: boolean;
        trust_score: number;
        school_id: string | null;
        role: "student" | "teacher" | "recruiter" | "admin";
      };
    }
  }
}

export type TierRequirement = {
  /** Minimum tier required (0-3) */
  minTier?: 0 | 1 | 2 | 3;
  /** Minimum trust score required */
  minTrustScore?: number;
  /** Require user to be verified */
  requireVerified?: boolean;
  /** Allowed roles */
  allowedRoles?: Array<"student" | "teacher" | "recruiter" | "admin">;
};

/**
 * Create a middleware that checks user's tier/trust score
 */
export function requireTier(requirement: TierRequirement) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;

    // Check if user exists
    if (!user) {
      return res
        .status(401)
        .json(
          createErrorResponse(
            ErrorCodes.AUTH_UNAUTHORIZED,
            "Authentication required"
          )
        );
    }

    // Check role if specified
    if (
      requirement.allowedRoles &&
      !requirement.allowedRoles.includes(user.role)
    ) {
      return res
        .status(403)
        .json(
          createErrorResponse(
            ErrorCodes.PERMISSION_FORBIDDEN_ROLE,
            `Role '${user.role}' not allowed for this endpoint`
          )
        );
    }

    // Check verified status
    if (requirement.requireVerified && !user.is_verified) {
      return res
        .status(403)
        .json(
          createErrorResponse(
            ErrorCodes.PERMISSION_VERIFICATION_REQUIRED,
            "Account verification required. Please verify your student ID."
          )
        );
    }

    // Check tier
    if (requirement.minTier !== undefined) {
      const userTier = getUserTier(user.is_verified, user.trust_score);
      if (userTier < requirement.minTier) {
        return res
          .status(403)
          .json(
            createErrorResponse(
              ErrorCodes.PERMISSION_TIER_TOO_LOW,
              `Access requires Tier ${requirement.minTier}. Your current tier: ${userTier}`
            )
          );
      }
    }

    // Check trust score directly
    if (
      requirement.minTrustScore !== undefined &&
      user.trust_score < requirement.minTrustScore
    ) {
      return res
        .status(403)
        .json(
          createErrorResponse(
            ErrorCodes.PERMISSION_INSUFFICIENT_TRUST,
            `Access requires trust score of ${requirement.minTrustScore}. Your score: ${user.trust_score}`
          )
        );
    }

    next();
  };
}

// ============================================================================
// CONVENIENCE MIDDLEWARE EXPORTS
// ============================================================================

/** Require user to be verified (Tier 1+) */
export const requireVerified = requireTier({ requireVerified: true });

/** Require Tier 2 (trust_score >= 60) - Marketplace access */
export const requireTier2 = requireTier({ minTier: 2 });

/** Require Tier 3 (trust_score >= 80) - Streaming & Anonymous Reviews */
export const requireTier3 = requireTier({ minTier: 3 });

/** Require admin role */
export const requireAdmin = requireTier({ allowedRoles: ["admin"] });

/** Require recruiter or admin role */
export const requireRecruiter = requireTier({
  allowedRoles: ["recruiter", "admin"],
});

/** Require student role */
export const requireStudent = requireTier({ allowedRoles: ["student"] });
