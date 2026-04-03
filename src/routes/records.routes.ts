import { Router } from "express";
import { getDb } from "../db";
import { requireAuth, requireRole } from "../middleware/auth.middleware";
import { AppError } from "../middleware/error.middleware";
import { validateBody } from "../middleware/validation.middleware";
import { createRecordSchema, updateRecordSchema } from "../validators/record.validators";

export const recordsRouter = Router();

recordsRouter.use(requireAuth);

recordsRouter.get("/", requireRole("analyst", "admin"), async (req, res, next) => {
  try {
    const { type, category, startDate, endDate } = req.query;
    const db = await getDb();

    const filters: string[] = ["deleted_at IS NULL"];
    const values: Array<string> = [];

    if (type && typeof type === "string") {
      filters.push("type = ?");
      values.push(type);
    }

    if (category && typeof category === "string") {
      filters.push("category = ?");
      values.push(category);
    }

    if (startDate && typeof startDate === "string") {
      filters.push("date >= ?");
      values.push(startDate);
    }

    if (endDate && typeof endDate === "string") {
      filters.push("date <= ?");
      values.push(endDate);
    }

    const rows = await db.all(
      `SELECT id, amount, type, category, date, notes, created_by, created_at, updated_at
       FROM financial_records
       WHERE ${filters.join(" AND ")}
       ORDER BY date DESC, id DESC`,
      ...values
    );

    res.status(200).json({ data: rows });
  } catch (error) {
    next(error);
  }
});

recordsRouter.post("/", requireRole("admin"), validateBody(createRecordSchema), async (req, res, next) => {
  try {
    const { amount, type, category, date, notes } = req.body;
    const db = await getDb();

    const result = await db.run(
      `INSERT INTO financial_records (amount, type, category, date, notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      amount,
      type,
      category,
      date,
      notes || null,
      req.user!.id
    );

    const row = await db.get(
      `SELECT id, amount, type, category, date, notes, created_by, created_at, updated_at
       FROM financial_records WHERE id = ?`,
      result.lastID
    );

    res.status(201).json({ data: row });
  } catch (error) {
    next(error);
  }
});

recordsRouter.patch("/:id", requireRole("admin"), validateBody(updateRecordSchema), async (req, res, next) => {
  try {
    const recordId = Number(req.params.id);
    if (Number.isNaN(recordId)) {
      throw new AppError(400, "Invalid record id");
    }

    const db = await getDb();
    const existing = await db.get<{ id: number }>(
      `SELECT id FROM financial_records WHERE id = ? AND deleted_at IS NULL`,
      recordId
    );

    if (!existing) {
      throw new AppError(404, "Record not found");
    }

    const updates: string[] = [];
    const values: Array<string | number> = [];

    if (req.body.amount !== undefined) {
      updates.push("amount = ?");
      values.push(req.body.amount);
    }
    if (req.body.type) {
      updates.push("type = ?");
      values.push(req.body.type);
    }
    if (req.body.category) {
      updates.push("category = ?");
      values.push(req.body.category);
    }
    if (req.body.date) {
      updates.push("date = ?");
      values.push(req.body.date);
    }
    if (req.body.notes !== undefined) {
      updates.push("notes = ?");
      values.push(req.body.notes);
    }

    updates.push("updated_at = datetime('now')");

    await db.run(
      `UPDATE financial_records SET ${updates.join(", ")} WHERE id = ?`,
      ...values,
      recordId
    );

    const updated = await db.get(
      `SELECT id, amount, type, category, date, notes, created_by, created_at, updated_at
       FROM financial_records WHERE id = ?`,
      recordId
    );

    res.status(200).json({ data: updated });
  } catch (error) {
    next(error);
  }
});

recordsRouter.delete("/:id", requireRole("admin"), async (req, res, next) => {
  try {
    const recordId = Number(req.params.id);
    if (Number.isNaN(recordId)) {
      throw new AppError(400, "Invalid record id");
    }

    const db = await getDb();
    const existing = await db.get<{ id: number }>(
      `SELECT id FROM financial_records WHERE id = ? AND deleted_at IS NULL`,
      recordId
    );

    if (!existing) {
      throw new AppError(404, "Record not found");
    }

    await db.run(
      `UPDATE financial_records
       SET deleted_at = datetime('now'), updated_at = datetime('now')
       WHERE id = ?`,
      recordId
    );

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
