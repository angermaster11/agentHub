import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import morgan from "morgan";

import connectDB from "./config/db.js";
import authRoutes from "./routes/auth.routes.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.set("trust proxy", true);

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "RangamAI API",
    timestamp: new Date().toISOString(),
  });
});

app.get("/health", (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatus =
    dbState === 1 ? "connected" :
    dbState === 2 ? "connecting" :
    dbState === 3 ? "disconnecting" : "disconnected";

  res.status(200).json({
    success: true,
    status: "UP",
    database: dbStatus,
    uptime: `${process.uptime().toFixed(2)}s`,
    environment: process.env.NODE_ENV || "development",
  });
});

app.use("/auth", authRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Cannot ${req.method} ${req.originalUrl}`,
  });
});

app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  console.error(`[ERROR] ${err.message}`, err.stack);

  res.status(status).json({
    success: false,
    message: process.env.NODE_ENV === "production"
      ? "Internal Server Error"
      : err.message,
  });
});

async function startServer() {
  await connectDB();

  const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} [${process.env.NODE_ENV || "development"}]`);
  });

  const shutdown = async (signal) => {
    console.log(`${signal} received. Shutting down...`);
    server.close(async () => {
      if (mongoose.connection.readyState === 1) {
        await mongoose.connection.close();
      }
      process.exit(0);
    });
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

startServer().catch((err) => {
  console.error("Failed to start server:", err.message);
  process.exit(1);
});
