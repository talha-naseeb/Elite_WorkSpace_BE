const ApiError = require("../../utils/apiError");
const { validateTimezone } = require("../../shared/utils/timezone");

const requireTimezone = (req, _res, next) => {
  req.body.timezone = validateTimezone(req.body.timezone);
  next();
};

const validateAdjustmentReview = (req, _res, next) => {
  if (!["approved", "rejected"].includes(req.body.status)) {
    return next(ApiError.badRequest("Adjustment review status must be approved or rejected."));
  }
  return next();
};

module.exports = {
  requireTimezone,
  validateAdjustmentReview,
};
