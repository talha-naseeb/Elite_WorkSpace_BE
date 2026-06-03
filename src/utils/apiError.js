class ApiError extends Error {
  constructor(statusCode, message, errors = [], details = {}) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.success = false;
    Object.assign(this, details);
  }

  static badRequest(message, errors = [], details = {}) {
    return new ApiError(400, message, errors, details);
  }

  static unauthorized(message = "Unauthorized") {
    return new ApiError(401, message);
  }

  static forbidden(message = "Forbidden") {
    return new ApiError(403, message);
  }

  static notFound(message = "Resource not found") {
    return new ApiError(404, message);
  }

  static conflict(message = "Conflict") {
    return new ApiError(409, message);
  }

  static internal(message = "Internal Server Error") {
    return new ApiError(500, message);
  }
}

module.exports = ApiError;
