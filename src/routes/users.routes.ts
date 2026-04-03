import { Router } from "express";
import bcrypt from "bcryptjs";
import { getDb } from "../db";
import { requireAuth, requireRole } from "../middleware/auth.middleware";
import { AppError } from "../middleware/error.middleware";
import { validateBody } from "../middleware/validation.middleware";
import { createUserSchema, updateUserSchema } from "../validators/user.validators";

export const userRouter = Router();

userRouter.use(requireAuth);
userRouter.use(requireRole("admin"));

userRouter.get("/", async (_req, res, next) => {
  try {
    const db = await getDb();
    const users = await db.all(
      `SELECT id, name, email, role, status, created_at, updated_at FROM users ORDER BY id ASC`
    );
    res.status(200).json({ data: users });
  } catch (error) {
    next(error);
  }
});

userRouter.post("/", validateBody(createUserSchema), async (req, res, next) => {
  try {
    const { name, email, password, role, status } = req.body;
    const db = await getDb();

    const existing = await db.get<{ id: number }>(`SELECT id FROM users WHERE email = ?`, email);
    if (existing) {
      throw new AppError(409, "Email already exists");
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await db.run(
      `INSERT INTO users (name, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?)`,
      name,
      email,
      passwordHash,
      role,
      status
    );

    const user = await db.get(
      `SELECT id, name, email, role, status, created_at, updated_at FROM users WHERE id = ?`,
      result.lastID
    );

    res.status(201).json({ data: user });
  } catch (error) {
    next(error);
  }
});

userRouter.patch("/:id", validateBody(updateUserSchema), async (req, res, next) => {
  try {
    const userId = Number(req.params.id);
    if (Number.isNaN(userId)) {
      throw new AppError(400, "Invalid user id");
    }

    const db = await getDb();
    const existing = await db.get<{ id: number }>(`SELECT id FROM users WHERE id = ?`, userId);
    if (!existing) {
      throw new AppError(404, "User not found");
    }

    const updates: string[] = [];
    const values: Array<string> = [];

    if (req.body.name) {
      updates.push("name = ?");
      values.push(req.body.name);
    }
    if (req.body.password) {
      const passwordHash = await bcrypt.hash(req.body.password, 10);
      updates.push("password_hash = ?");
      values.push(passwordHash);
    }
    if (req.body.role) {
      updates.push("role = ?");
      values.push(req.body.role);
    }
    if (req.body.status) {
      updates.push("status = ?");
      values.push(req.body.status);
    }

    updates.push("updated_at = datetime('now')");

    await db.run(
      `UPDATE users SET ${updates.join(", ")} WHERE id = ?`,
      ...values,
      userId.toString()
    );

    const updated = await db.get(
      `SELECT id, name, email, role, status, created_at, updated_at FROM users WHERE id = ?`,
      userId
    );

    res.status(200).json({ data: updated });
  } catch (error) {
    next(error);
  }
});
