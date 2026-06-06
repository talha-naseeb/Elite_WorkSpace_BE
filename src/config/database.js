const mongoose = require("mongoose");
const { ensureAttendanceIndexes } = require("./attendance-indexes");
const { logger } = require("../utils/logger");

mongoose.connection.on("connected", () => {
  logger.info("mongodb.connection.established");
});

mongoose.connection.on("disconnected", () => {
  console.warn("MongoDB connection lost");
});

mongoose.connection.on("error", (error) => {
  console.error("MongoDB connection error:", error.message);
});

let connectionPromise = null;

const getDbStatus = () => {
  const states = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };

  return states[mongoose.connection.readyState] || "unknown";
};

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is not set");
  }

  if (!connectionPromise) {
    connectionPromise = mongoose
      .connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 5000,
        maxPoolSize: process.env.NODE_ENV === "production" ? 10 : 5,
      })
      .then(async (conn) => {
        logger.info("mongodb.connected", { host: conn.connection.host });
        await ensureAttendanceIndexes();
        return conn.connection;
      })
      .catch((error) => {
        connectionPromise = null;
        console.error(`Error: ${error.message}`);
        throw error;
      });
  }

  return connectionPromise;
};

module.exports = connectDB;
module.exports.getDbStatus = getDbStatus;
