import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config";
import { getDb } from "../db";
import { AuthUser, UserRole } from "../types";
import { AppError } from "./error.middleware";

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

interface TokenPayload {
  sub: number;
  email: string;
  role: UserRole;
}

function isTokenPayload(payload: unknown): payload is TokenPayload {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  const candidate = payload as Partial<TokenPayload>;
  return (
    typeof candidate.sub === "number" &&
    typeof candidate.email === "string" &&
    (candidate.role === "viewer" || candidate.role === "analyst" || candidate.role === "admin")
  );
}

export function signAuthToken(user: AuthUser) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role
    },
    config.jwtSecret,
    { expiresIn: "1d" }
  );
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(new AppError(401, "Missing or invalid Authorization header"));
  }

  const token = authHeader.replace("Bearer ", "").trim();

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    if (!isTokenPayload(decoded)) {
      return next(new AppError(401, "Invalid token payload"));
    }

    const db = await getDb();

    const user = await db.get<AuthUser>(
      `SELECT id, email, role, status FROM users WHERE id = ?`,
      decoded.sub
    );

    if (!user || user.status !== "active") {
      return next(new AppError(401, "User is not active or does not exist"));
    }

    req.user = user;
    next();
  } catch {
    return next(new AppError(401, "Invalid or expired token"));
  }
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError(401, "Authentication required"));
    }

    if (!roles.includes(req.user.role)) {
      return next(new AppError(403, "Insufficient permissions"));
    }

    next();
  };
}
