const ApiError = require("../apiError");

const errorHandler = (err, req, res, next) => {
  let error = err;

  // If the error is not an instance of ApiError, convert it
  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || 500;
    const message = error.message || "Internal Server Error";
    error = new ApiError(statusCode, message);
  }

  // MongoDB duplicate key error
  if (error.code === 11000) {
    error = ApiError.conflict("Duplicate field value entered");
  }

  // MongoDB validation error
  if (error.name === "ValidationError") {
    const errors = Object.values(error.errors).map((err) => err.message);
    error = ApiError.badRequest("Validation Error", errors);
  }

  // JWT errors
  if (error.name === "JsonWebTokenError") {
    error = ApiError.unauthorized("Invalid token");
  }

  if (error.name === "TokenExpiredError") {
    error = ApiError.unauthorized("Token expired");
  }

  const response = {
    success: false,
    message: error.message,
  };

  if (error.errors?.length) {
    response.errors = error.errors;
  }

  res.status(error.statusCode).json(response);
};

module.exports = errorHandler;
