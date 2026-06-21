import "express";
import type { Role } from "../auth/jwt";

declare global {
  namespace Express {
    interface Request {
      // Set by requireAuth middleware. Scope all queries to req.user.
      user?: { id: string; role: Role };
    }
  }
}
