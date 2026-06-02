const mongoose = require("mongoose");

mongoose.connection.on("connected", () => {
  console.log("MongoDB connection established");
});

mongoose.connection.on("disconnected", () => {
  console.warn("MongoDB connection lost");
});

mongoose.connection.on("error", (error) => {
  console.error("MongoDB connection error:", error.message);
});

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
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      maxPoolSize: process.env.NODE_ENV === "production" ? 10 : 5,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
module.exports.getDbStatus = getDbStatus;
