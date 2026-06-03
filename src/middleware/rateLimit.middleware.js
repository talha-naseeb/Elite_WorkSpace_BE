const isProd = process.env.NODE_ENV === "production";

let rateLimit;
try {
  rateLimit = require("express-rate-limit");
} catch (error) {
  if (error && error.code === "MODULE_NOT_FOUND") {
    const msg = "express-rate-limit is not installed. Rate limiting is disabled. Run 'npm install express-rate-limit' to enable it.";
    if (isProd) {
      console.error(msg);
      throw new Error(msg);
    }
    console.warn(msg, error.message);
  } else {
    console.error("Failed to initialize rate limiting module:", error);
    throw error;
  }
}

const createNoopLimiter = () => (req, res, next) => next();

if (!rateLimit && isProd) {
  throw new Error("express-rate-limit is required in production.");
}

const defaultLimiterConfig = {
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => ["/api/health", "/health", "/metrics"].includes(req.path),
};

const createLimiterConfig = ({ windowMs, max, message, keyGenerator }) => ({
  windowMs,
  max,
  message,
  keyGenerator,
  ...defaultLimiterConfig,
  handler: (req, res) => {
    return res.status(429).json(message ?? {
      success: false,
      message: "Too many requests. Please try again later.",
    });
  },
});

const createLimiter = ({ windowMs, max, message, keyGenerator }) => {
  if (!rateLimit) {
    return createNoopLimiter();
  }

  return rateLimit(createLimiterConfig({ windowMs, max, message, keyGenerator }));
};

const authRateLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: {
    success: false,
    message: "Too many auth attempts from this IP, please try again after 15 minutes.",
  },
  keyGenerator: (req) => {
    const user = req.body?.email?.toString().toLowerCase();
    return user ? `${user}|${req.ip}` : req.ip;
  },
});

const generalRateLimiter = createLimiter({
  windowMs: 10 * 60 * 1000,
  max: 300,
  message: {
    success: false,
    message: "Too many requests from this IP, please slow down and try again later.",
  },
  keyGenerator: (req) => req.ip,
});

module.exports = {
  authRateLimiter,
  createLimiterConfig,
  generalRateLimiter,
};
