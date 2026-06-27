import type { Request, Response, NextFunction } from "express";
import { auth } from "./auth";
import { Role } from "../../core/src/index";

declare global {
  namespace Express {
    interface Request {
      user?: typeof auth.$Infer.Session.user;
    }
  }
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const session = await auth.api.getSession({ headers: req.headers as any });
    if (!session) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    // Check if user is admin using Role enum
    if (session.user?.role !== Role.ADMIN) {
      res.status(403).json({ error: "Forbidden: Admin access required" });
      return;
    }

    req.user = session.user;
    next();
  } catch {
    res.status(401).json({ error: "Unauthorized" });
  }
}