const clientOrigins = (process.env.CLIENT_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

if (clientOrigins.length === 0) {
  if (process.env.NODE_ENV === "production") {
    console.error("FATAL: CLIENT_ORIGINS is not configured in production. CORS is permissive and this is unsafe. Set CLIENT_ORIGINS with allowed origins.");
    process.exit(1);
  }

  console.warn("WARNING: CLIENT_ORIGINS not configured. CORS will allow all origins in non-production environments.");
}

const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  if (clientOrigins.length === 0) return process.env.NODE_ENV !== "production";
  return clientOrigins.includes(origin);
};

const corsOptions = {
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) {
      return callback(null, true);
    }

    return callback(new Error("Origin not allowed by CORS"));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  credentials: true,
};

module.exports = { corsOptions, isAllowedOrigin };
