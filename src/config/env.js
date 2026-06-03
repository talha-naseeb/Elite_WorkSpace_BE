const REQUIRED_PRODUCTION_ENV = [
  "MONGODB_URI",
  "JWT_SECRET",
  "ADMIN_SECRET",
  "FRONTEND_URL",
  "CLIENT_ORIGINS",
];

const getMissingRequiredEnv = (env = process.env) => {
  if (env.NODE_ENV !== "production") {
    return [];
  }

  return REQUIRED_PRODUCTION_ENV.filter((key) => !env[key]);
};

const enforceProductionEnv = (env = process.env) => {
  const missing = getMissingRequiredEnv(env);

  if (missing.length > 0) {
    throw new Error(`Missing required production environment variables: ${missing.join(", ")}`);
  }
};

module.exports = {
  REQUIRED_PRODUCTION_ENV,
  getMissingRequiredEnv,
  enforceProductionEnv,
};
