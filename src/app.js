import express from "express";
import helmet from "helmet";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import { env } from "./config/env.js";
import { openapi } from "./openapi.js";
import userRoutes from "./routes/userRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import {
  errorMiddleware,
  notFoundMiddleware,
} from "./middlewares/errorMiddleware.js";

export const app = express();
app.disable("x-powered-by");
app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGIN.split(",").map((origin) => origin.trim()),
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use(express.json({ limit: "10kb" }));
app.get("/health", (_req, res) => res.status(200).json({ status: "ok" }));
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openapi));
app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);
app.use(notFoundMiddleware);
app.use(errorMiddleware);
