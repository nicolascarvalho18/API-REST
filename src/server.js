import { app } from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./config/database.js";
import { logger } from "./utils/logger.js";

const server = app.listen(env.PORT, () =>
  logger.info("Server listening", {
    port: env.PORT,
    environment: env.NODE_ENV,
  }),
);
let shuttingDown = false;
const shutdown = (signal) => {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info("Graceful shutdown started", { signal });
  server.close(async (error) => {
    try {
      await prisma.$disconnect();
    } catch (disconnectError) {
      logger.error("Database disconnect failed", {
        name: disconnectError.name,
      });
    }
    if (error) {
      logger.error("HTTP server close failed", { name: error.name });
      process.exitCode = 1;
    }
  });
  setTimeout(() => process.exit(1), 10000).unref();
};
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
