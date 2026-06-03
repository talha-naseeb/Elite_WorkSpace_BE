const parseClientOrigins = (env = process.env) =>
  (env.CLIENT_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

const createIsAllowedOrigin = (env = process.env) => {
  const clientOrigins = parseClientOrigins(env);
  const isProduction = env.NODE_ENV === "production";

  if (clientOrigins.length === 0 && !isProduction) {
    console.warn("WARNING: CLIENT_ORIGINS not configured. CORS will allow all origins in non-production environments.");
  }

  return (origin) => {
    if (!origin) return true;
    if (clientOrigins.length === 0) return !isProduction;
    return clientOrigins.includes(origin);
  };
};

const createCorsOptions = (env = process.env) => {
  const allowOrigin = createIsAllowedOrigin(env);

  return {
    origin(origin, callback) {
      if (allowOrigin(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Origin not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
  };
};

const isAllowedOrigin = createIsAllowedOrigin();
const corsOptions = createCorsOptions();

module.exports = {
  corsOptions,
  createCorsOptions,
  createIsAllowedOrigin,
  isAllowedOrigin,
  parseClientOrigins,
};
