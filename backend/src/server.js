import "dotenv/config";
import express from "express";
import "express-async-errors";
import cors from "cors";
import helmet from "helmet";
import { connectDb } from "./config/db.js";
import authRoutes from "./routes/auth.js";
import servicesRoutes from "./routes/services.js";
import paymentRoutes from "./routes/payment.js";
import accessRoutes from "./routes/access.js";
import creatorRoutes from "./routes/creator.js";
import mockAiRoutes from "./routes/mockAi.js";

const app = express();
const origin =
  process.env.FRONTEND_ORIGIN || process.env.FRONTEND_URL || "http://localhost:5173";

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(
  cors({
    origin,
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/services", servicesRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/access", accessRoutes);
app.use("/api/creator", creatorRoutes);
app.use("/api/mock", mockAiRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  if (err?.name === "CastError") {
    return res.status(400).json({ error: "Invalid id" });
  }
  if (err?.name === "ValidationError") {
    return res.status(400).json({ error: err.message });
  }
  res.status(500).json({
    error: "Internal server error",
    detail: process.env.NODE_ENV === "development" ? err?.message : undefined,
  });
});

const port = Number(process.env.PORT) || 5000;

connectDb()
  .then(() => {
    const server = app.listen(port, () => {
      console.log(`API listening on ${port}`);
    });
    server.on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        console.error(
          `Port ${port} is already in use. Close the other app using it or set PORT in backend/.env (e.g. PORT=5001) and match your Vite proxy target.`
        );
      } else {
        console.error(err);
      }
      process.exit(1);
    });
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
