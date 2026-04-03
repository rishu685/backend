import bcrypt from "bcryptjs";
import sqlite3 from "sqlite3";
import { Database, open } from "sqlite";
import { config } from "./config";

let db: Database<sqlite3.Database, sqlite3.Statement> | null = null;

export async function getDb() {
  if (!db) {
    db = await open({
      filename: config.dbPath,
      driver: sqlite3.Database
    });

    await db.exec("PRAGMA foreign_keys = ON;");
  }

  return db;
}

export async function initializeDatabase() {
  const conn = await getDb();

  await conn.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('viewer', 'analyst', 'admin')),
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS financial_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      amount REAL NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
      category TEXT NOT NULL,
      date TEXT NOT NULL,
      notes TEXT,
      created_by INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      deleted_at TEXT,
      FOREIGN KEY(created_by) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_financial_records_date ON financial_records(date);
    CREATE INDEX IF NOT EXISTS idx_financial_records_category ON financial_records(category);
    CREATE INDEX IF NOT EXISTS idx_financial_records_type ON financial_records(type);
  `);

  await seedDefaultUsers(conn);
}

async function seedDefaultUsers(conn: Database<sqlite3.Database, sqlite3.Statement>) {
  const countResult = await conn.get<{ count: number }>("SELECT COUNT(*) as count FROM users");
  if ((countResult?.count || 0) > 0) {
    return;
  }

  const defaults = [
    { name: "Admin User", email: "admin@finance.local", password: "Admin123!", role: "admin" },
    { name: "Analyst User", email: "analyst@finance.local", password: "Analyst123!", role: "analyst" },
    { name: "Viewer User", email: "viewer@finance.local", password: "Viewer123!", role: "viewer" }
  ];

  for (const user of defaults) {
    const passwordHash = await bcrypt.hash(user.password, 10);
    await conn.run(
      `INSERT INTO users (name, email, password_hash, role, status) VALUES (?, ?, ?, ?, 'active')`,
      user.name,
      user.email,
      passwordHash,
      user.role
    );
  }
}

export async function closeDatabase() {
  if (db) {
    await db.close();
    db = null;
  }
}
