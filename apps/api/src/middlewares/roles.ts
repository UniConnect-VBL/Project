import { Response, NextFunction } from "express";
import { AuthedRequest } from "./auth.js";
import { ErrorCodes, type UserRole } from "@unihood/types";

/**
 * Trust Tier Thresholds (Rule 4: Gradual Trust & Verification Logic)
 * - Tier 0 (Guest): Read-only feed, like/comment restricted
 * - Tier 1 (Verified): Full social features (post, comment, chat)
 * - Tier 2 (Trust > 60): Access Marketplace
 * - Tier 3 (Trust > 80): Access Streaming & Anonymous Reviews
 */
const TRUST_TIER_THRESHOLDS = [0, 0, 60, 80];

/**
 * Flexible Authorization Middleware
 * Combines Role-based and Trust-tier-based access control
 *
 * @param minTier - Minimum trust tier required (0-3)
 * @param allowedRoles - Optional array of allowed roles (admin always bypasses)
 */
export const authorize = (
  minTier: number = 0,
  allowedRoles: UserRole[] = []
) => {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    const user = req.user;

    // Must be authenticated
    if (!user) {
      return res.status(401).json({
        success: false,
        code: ErrorCodes.AUTH_UNAUTHORIZED,
        error: "Authentication required",
      });
    }

    // 1. Admin Bypass - admins can access everything
    if (user.role === "admin") {
      return next();
    }

    // 2. Check Role if specified
    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        code: ErrorCodes.PERMISSION_FORBIDDEN_ROLE,
        error: "Role not authorized for this action",
      });
    }

    // 3. Check Verification for Tier 1+
    if (minTier >= 1 && !user.is_verified) {
      return res.status(403).json({
        success: false,
        code: ErrorCodes.PERMISSION_VERIFICATION_REQUIRED,
        error: "Verification required for this action",
      });
    }

    // 4. Check Trust Score for Tier 2+
    const requiredScore = TRUST_TIER_THRESHOLDS[minTier] ?? 0;
    if (user.trust_score < requiredScore) {
      return res.status(403).json({
        success: false,
        code: ErrorCodes.PERMISSION_INSUFFICIENT_TRUST,
        error: `Trust score ${requiredScore}+ required`,
      });
    }

    next();
  };
};

/**
 * Shorthand middlewares for common use cases
 */

// Requires user to be verified (Tier 1)
export function requireVerified(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
) {
  return authorize(1)(req, res, next);
}

// Requires admin role
export function requireAdmin(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
) {
  const user = req.user;

  if (!user) {
    return res.status(401).json({
      success: false,
      code: ErrorCodes.AUTH_UNAUTHORIZED,
      error: "Authentication required",
    });
  }

  if (user.role !== "admin") {
    return res.status(403).json({
      success: false,
      code: ErrorCodes.PERMISSION_NOT_ADMIN,
      error: "Admin access required",
    });
  }

  next();
}

// Requires recruiter role (for job posting)
export function requireRecruiter(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
) {
  return authorize(1, ["recruiter"])(req, res, next);
}

// Requires Tier 2 (Trust > 60) for Marketplace access
export function requireMarketplaceAccess(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
) {
  return authorize(2)(req, res, next);
}

// Requires Tier 3 (Trust > 80) for Streaming & Anonymous Reviews
export function requireStreamingAccess(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
) {
  return authorize(3)(req, res, next);
}
