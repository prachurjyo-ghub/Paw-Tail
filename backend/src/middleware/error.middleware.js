const logger = require("../utils/logger");

const notFound = (req, res, next) => {
  const error = new Error(`Route not found: ${req.path}`);
  error.statusCode = 404;
  next(error);
};

const errorHandler = (error, req, res, next) => {
  let statusCode = error.statusCode || 500;
  let message = error.message || "Internal server error";

  if (error.name === "CastError") {
    statusCode = 400;
    message = "Invalid resource id";
  }

  if (error.name === "ValidationError") {
    statusCode = 400;
    message = Object.values(error.errors)
      .map((validationError) => validationError.message)
      .join(", ");
  }

  if (error.code === 11000) {
    statusCode = 400;
    message = "Duplicate value already exists";
  }

  if (error.code === "LIMIT_FILE_SIZE") {
    statusCode = 400;
    message = "Image is too large. Please upload an image under the size limit.";
  }

  if (
    [
      "LIMIT_FILE_COUNT",
      "LIMIT_PART_COUNT",
      "LIMIT_FIELD_COUNT",
      "LIMIT_FIELD_KEY",
      "LIMIT_FIELD_VALUE",
      "LIMIT_UNEXPECTED_FILE",
    ].includes(error.code)
  ) {
    statusCode = 400;
    message = "Too many multipart fields or files were submitted.";
  }

  if (
    [
      "INVALID_IMAGE_TYPE",
      "INVALID_IMAGE_CONTENT",
      "UNSUPPORTED_IMAGE_FORMAT",
    ].includes(error.code)
  ) {
    statusCode = 400;
    message = error.message;
  }

  if (statusCode === 500) {
    logger.error("http.internal_error", {
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      route: req.route?.path,
      message: error.message || "Internal server error",
      stack: error.stack,
    });
    message = "Internal server error";
  }

  const response = {
    success: false,
    message,
  };

  if (statusCode === 500 && req.requestId) {
    response.requestId = req.requestId;
  }

  res.status(statusCode).json(response);
};

module.exports = {
  notFound,
  errorHandler,
};
