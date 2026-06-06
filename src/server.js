const http = require("http");
const mongoose = require("mongoose");
const { Server } = require("socket.io");
const app = require("./app");
const connectDB = require("./config/database");
const { enforceProductionEnv } = require("./config/env");
const { corsOptions } = require("./config/cors");
const configureSocketAuth = require("./sockets/auth.socket");
const initializeSockets = require("./sockets");
const { registerJobs } = require("./jobs");
const { registerEventListeners } = require("./events");
const { logger } = require("./utils/logger");

const PORT = process.env.PORT || 5001;
const server = http.createServer(app);
const io = new Server(server, {
  cors: corsOptions,
});

app.set("io", io);
configureSocketAuth(io);
initializeSockets(io);

const shutdown = async (signal) => {
  logger.info("server.shutdown.started", { signal });
  server.close(async () => {
    logger.info("server.http.closed");
    await mongoose.connection.close();
    logger.info("server.mongodb.closed");
    process.exit(0);
  });

  setTimeout(() => {
    console.error("Shutdown timeout — forcing exit.");
    process.exit(1);
  }, 10000);
};

const startServer = async () => {
  enforceProductionEnv();
  await connectDB();
  registerEventListeners();
  registerJobs();

  server.listen(PORT, () => {
    logger.info("server.started", { port: PORT });
  });
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

startServer().catch((error) => {
  logger.error("server.start.failed", { message: error.message });
  process.exit(1);
});

module.exports = { app, server, startServer };
