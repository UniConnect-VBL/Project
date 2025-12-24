import { Request, Response, NextFunction } from "express";
import { createAuditLog } from "../services/audit.service.js";

export function auditMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const originalJson = res.json.bind(res);

  res.json = function (body: unknown) {
    // Only log if successful (2xx status)
    if (res.statusCode >= 200 && res.statusCode < 300) {
      const adminId = (req as { user?: { id: string } }).user?.id;
      const action = req.method + " " + req.path;
      const targetId = req.params.id;
      const targetType = req.body.type || req.path.split("/")[1];

      // Async log (don't block response) - only log if adminId exists
      if (adminId) {
        createAuditLog(
          adminId,
          action,
          targetId,
          targetType,
          { body: req.body, query: req.query },
          req.ip || "unknown"
        ).catch((err) => console.error("Audit log error:", err));
      }
    }

    return originalJson(body);
  };

  next();
}
