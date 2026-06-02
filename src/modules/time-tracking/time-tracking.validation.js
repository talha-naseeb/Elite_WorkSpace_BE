const ApiError = require("../../shared/errors/apiError");

const ALLOWED_SOURCES = new Set(["manual", "desktop-app", "browser"]);

const validateClockInPayload = (req, _res, next) => {
  const { source, notes } = req.body || {};

  if (source && !ALLOWED_SOURCES.has(source)) {
    return next(
      ApiError.badRequest("Invalid time tracking source", [
        {
          field: "source",
          allowedValues: Array.from(ALLOWED_SOURCES),
          guidance: "Use one of: manual, desktop-app, browser.",
        },
      ])
    );
  }

  if (notes && typeof notes === "string" && notes.length > 500) {
    return next(
      ApiError.badRequest("Notes must be 500 characters or fewer", [
        { field: "notes", maxLength: 500 },
      ])
    );
  }

  return next();
};

module.exports = { validateClockInPayload, ALLOWED_SOURCES };
