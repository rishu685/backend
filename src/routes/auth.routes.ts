import { Router } from "express";
import bcrypt from "bcryptjs";
import { getDb } from "../db";
import { AppError } from "../middleware/error.middleware";
import { validateBody } from "../middleware/validation.middleware";
import { loginSchema } from "../validators/auth.validators";
import { signAuthToken } from "../middleware/auth.middleware";

export const authRouter = Router();

authRouter.post("/login", validateBody(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const db = await getDb();

    const user = await db.get<{
      id: number;
      email: string;
      role: "viewer" | "analyst" | "admin";
      status: "active" | "inactive";
      password_hash: string;
    }>(
      `SELECT id, email, role, status, password_hash FROM users WHERE email = ?`,
      email
    );

    if (!user) {
      throw new AppError(401, "Invalid credentials");
    }

    if (user.status !== "active") {
      throw new AppError(403, "User is inactive");
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      throw new AppError(401, "Invalid credentials");
    }

    const token = signAuthToken({
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status
    });

    res.status(200).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status
      }
    });
  } catch (error) {
    next(error);
  }
});
