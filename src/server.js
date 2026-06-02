const http = require("http");
const mongoose = require("mongoose");
const { Server } = require("socket.io");
const app = require("./app");
const connectDB = require("./config/database");
const { corsOptions } = require("./config/cors");
const configureSocketAuth = require("./sockets/auth.socket");
const initializeSockets = require("./sockets");
const { registerJobs } = require("./jobs");
const { registerEventListeners } = require("./events");

const PORT = process.env.PORT || 5001;
const server = http.createServer(app);
const io = new Server(server, {
  cors: corsOptions,
});

app.set("io", io);
configureSocketAuth(io);
initializeSockets(io);

const shutdown = async (signal) => {
  console.log(`${signal} received. Shutting down gracefully...`);
  server.close(async () => {
    console.log("HTTP server closed.");
    await mongoose.connection.close();
    console.log("MongoDB connection closed.");
    process.exit(0);
  });

  setTimeout(() => {
    console.error("Shutdown timeout — forcing exit.");
    process.exit(1);
  }, 10000);
};

const startServer = async () => {
  await connectDB();
  registerEventListeners();
  registerJobs();

  server.listen(PORT, () => {
    console.log(`Server is running on port http://localhost:${PORT}`);
  });
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

startServer();

module.exports = { app, server, startServer };
