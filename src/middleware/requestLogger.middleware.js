const { logger } = require("../utils/logger");

const createRequestLogger = (requestLogger = logger) => (req, res, next) => {
  const start = Date.now();
  const origin = req.headers.origin || req.headers.referer || req.ip;

  res.on("finish", () => {
    requestLogger.info("api.request", {
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      origin,
      durationMs: Date.now() - start,
    });
  });

  next();
};

module.exports = {
  createRequestLogger,
  requestLogger: createRequestLogger(),
};
