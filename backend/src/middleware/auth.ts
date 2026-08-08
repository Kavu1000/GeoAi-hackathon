import { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../services/jwt.service";
import { ApiError } from "./error";

export interface AuthedRequest extends Request {
  user?: { id: string; role: string; operatorId?: string };
}

export function requireAuth(req: AuthedRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw new ApiError(401, "missing_token");
  }
  try {
    const payload = verifyAccessToken(header.slice("Bearer ".length));
    req.user = { id: payload.sub, role: payload.role, operatorId: payload.operatorId };
    next();
  } catch {
    throw new ApiError(401, "invalid_token");
  }
}

export function requireRole(...roles: string[]) {
  return (req: AuthedRequest, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new ApiError(403, "forbidden");
    }
    next();
  };
}
