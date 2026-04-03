import fs from "node:fs/promises";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

let app: ReturnType<(typeof import("../src/app"))["createApp"]>;
let closeDatabase: (typeof import("../src/db"))["closeDatabase"];

async function login(email: string, password: string) {
  const response = await request(app).post("/auth/login").send({ email, password });
  expect(response.status).toBe(200);
  return response.body.token as string;
}

beforeAll(async () => {
  process.env.DB_PATH = "./data/test.db";
  process.env.JWT_SECRET = "test-secret";

  await fs.rm("./data/test.db", { force: true });

  const dbModule = await import("../src/db");
  const appModule = await import("../src/app");

  await dbModule.initializeDatabase();
  app = appModule.createApp();
  closeDatabase = dbModule.closeDatabase;
});

afterAll(async () => {
  await closeDatabase();
  await fs.rm("./data/test.db", { force: true });
});

describe("Finance backend", () => {
  it("blocks viewer from creating records", async () => {
    const viewerToken = await login("viewer@finance.local", "Viewer123!");

    const response = await request(app)
      .post("/records")
      .set("Authorization", `Bearer ${viewerToken}`)
      .send({
        amount: 200,
        type: "income",
        category: "Salary",
        date: "2026-04-01",
        notes: "Test"
      });

    expect(response.status).toBe(403);
  });

  it("allows admin to create records and analyst to read records", async () => {
    const adminToken = await login("admin@finance.local", "Admin123!");
    const analystToken = await login("analyst@finance.local", "Analyst123!");

    const createRes = await request(app)
      .post("/records")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        amount: 5000,
        type: "income",
        category: "Salary",
        date: "2026-04-01",
        notes: "April salary"
      });

    expect(createRes.status).toBe(201);

    const listRes = await request(app)
      .get("/records")
      .set("Authorization", `Bearer ${analystToken}`);

    expect(listRes.status).toBe(200);
    expect(Array.isArray(listRes.body.data)).toBe(true);
    expect(listRes.body.data.length).toBeGreaterThan(0);
  });

  it("returns dashboard summary for viewer", async () => {
    const viewerToken = await login("viewer@finance.local", "Viewer123!");

    const summaryRes = await request(app)
      .get("/dashboard/summary")
      .set("Authorization", `Bearer ${viewerToken}`);

    expect(summaryRes.status).toBe(200);
    expect(summaryRes.body.data).toHaveProperty("totalIncome");
    expect(summaryRes.body.data).toHaveProperty("totalExpenses");
    expect(summaryRes.body.data).toHaveProperty("netBalance");
  });
});
