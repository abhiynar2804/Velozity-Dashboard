import express, { Express, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import prisma from "./utils/prisma";
import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import clientRoutes from "./routes/client.routes";
import projectRoutes from "./routes/project.routes";
import taskRoutes from "./routes/task.routes";
import activityRoutes from "./routes/activity.routes";
import { authenticate } from "./middleware/auth.middleware";
import { errorHandler } from "./middleware/error.middleware";
import { ApiResponse } from "./utils/ApiResponse";
import { createServer } from "http";
import { initializeSocket } from "./socket/socket.server";
import { taskService } from "./services/task.service";
import { startOverdueScheduler } from "./jobs/overdue.scheduler";
import { env } from "./config/env";

export const app: Express = express();
const port = process.env.PORT || 5000;

// Security & Parsing Middleware
app.use(helmet());
app.use(
  cors({
    origin: env.clientUrl,
    credentials: true, // Allow cookies across origins
  }),
);
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}

// Health Check
app.get("/health", async (req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json(
      ApiResponse.success("Server is healthy and DB is connected", {
        status: "ok",
      }),
    );
  } catch (error: any) {
    res
      .status(500)
      .json(
        ApiResponse.error("Database connection failed", 500, error?.message),
      );
  }
});

// Mount Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/activities", activityRoutes);

// Protected Test Route
app.get("/api/protected", authenticate, (req: Request, res: Response) => {
  res.status(200).json(
    ApiResponse.success("Access granted to protected route", {
      user: req.user,
      secretData: "Confidential Dashboard Metric Information",
    }),
  );
});

// Error Handling Middleware
app.use(errorHandler);

// Start server if not imported by test
const httpServer = createServer(app);

const io = initializeSocket(httpServer);
taskService.setSocketServer(io);
startOverdueScheduler();

if (process.env.NODE_ENV !== "test") {
  httpServer.listen(port, () => {
    console.log(`🚀 Server is running at http://localhost:${port}`);
  });
}

export { prisma };
export default app;
