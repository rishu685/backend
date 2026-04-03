import { Router } from "express";
import { getDb } from "../db";
import { requireAuth, requireRole } from "../middleware/auth.middleware";

export const dashboardRouter = Router();

dashboardRouter.use(requireAuth);
dashboardRouter.use(requireRole("viewer", "analyst", "admin"));

dashboardRouter.get("/summary", async (_req, res, next) => {
  try {
    const db = await getDb();

    const totals = await db.get<{
      total_income: number;
      total_expenses: number;
    }>(`
      SELECT
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expenses
      FROM financial_records
      WHERE deleted_at IS NULL
    `);

    const categoryTotals = await db.all<{
      category: string;
      total: number;
    }[]>(`
      SELECT category, COALESCE(SUM(amount), 0) as total
      FROM financial_records
      WHERE deleted_at IS NULL
      GROUP BY category
      ORDER BY total DESC
    `);

    res.status(200).json({
      data: {
        totalIncome: totals?.total_income || 0,
        totalExpenses: totals?.total_expenses || 0,
        netBalance: (totals?.total_income || 0) - (totals?.total_expenses || 0),
        categoryTotals
      }
    });
  } catch (error) {
    next(error);
  }
});

dashboardRouter.get("/recent", async (req, res, next) => {
  try {
    const limit = Number(req.query.limit || 10);
    const safeLimit = Number.isFinite(limit) && limit > 0 && limit <= 100 ? limit : 10;

    const db = await getDb();
    const rows = await db.all(
      `SELECT id, amount, type, category, date, notes, created_by, created_at, updated_at
       FROM financial_records
       WHERE deleted_at IS NULL
       ORDER BY date DESC, id DESC
       LIMIT ?`,
      safeLimit
    );

    res.status(200).json({ data: rows });
  } catch (error) {
    next(error);
  }
});

dashboardRouter.get("/trends", async (req, res, next) => {
  try {
    const period = req.query.period === "weekly" ? "weekly" : "monthly";
    const groupExpression =
      period === "weekly"
        ? "strftime('%Y-W%W', date)"
        : "strftime('%Y-%m', date)";

    const db = await getDb();
    const rows = await db.all(
      `SELECT
         ${groupExpression} as period,
         COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as income,
         COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as expense
       FROM financial_records
       WHERE deleted_at IS NULL
       GROUP BY period
       ORDER BY period ASC`
    );

    res.status(200).json({
      data: rows.map((row: { period: string; income: number; expense: number }) => ({
        ...row,
        net: row.income - row.expense
      }))
    });
  } catch (error) {
    next(error);
  }
});
