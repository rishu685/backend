import { createApp } from "./app";
import { config } from "./config";
import { initializeDatabase } from "./db";

async function startServer() {
  await initializeDatabase();

  const app = createApp();
  app.listen(config.port, () => {
    console.log(`Finance backend listening on port ${config.port}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});
