const createLogger = ({ env = process.env, sink = console } = {}) => {
  const isProduction = env.NODE_ENV === "production";

  const write = (level, message, meta = {}) => {
    const log = typeof sink[level] === "function" ? sink[level].bind(sink) : sink.log.bind(sink);

    if (isProduction) {
      return log(JSON.stringify({
        level,
        message,
        ...meta,
      }));
    }

    return log(message, meta);
  };

  return {
    info: (message, meta) => write("info", message, meta),
    warn: (message, meta) => write("warn", message, meta),
    error: (message, meta) => write("error", message, meta),
  };
};

const logger = createLogger();

module.exports = {
  createLogger,
  logger,
};
