import cors from "cors";
import express from "express";
import morgan from "morgan";
import { authRouter } from "./routes/auth.routes";
import { userRouter } from "./routes/users.routes";
import { recordsRouter } from "./routes/records.routes";
import { dashboardRouter } from "./routes/dashboard.routes";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware";

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(morgan("dev"));

  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  app.use("/auth", authRouter);
  app.use("/users", userRouter);
  app.use("/records", recordsRouter);
  app.use("/dashboard", dashboardRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
