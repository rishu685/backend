export const config = {
  port: Number(process.env.PORT || 4000),
  jwtSecret: process.env.JWT_SECRET || "dev-super-secret-key",
  dbPath: process.env.DB_PATH || "./data/finance.db"
};
