import type { Request, Response, NextFunction } from "express";
import { auth } from "./auth";

declare global {
  namespace Express {
    interface Request {
      user?: typeof auth.$Infer.Session.user;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const session = await auth.api.getSession({ headers: req.headers as any });
    if (!session) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    req.user = session.user;
    next();
  } catch {
    res.status(401).json({ error: "Unauthorized" });
  }
}
