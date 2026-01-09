import logger from "../shared/logging/logger.mjs";
/**
 * Global Error Handling Middleware
 */

export const globalErrorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  const logData = {
    message: err.message,
    stack: err.stack,
    httpMethod: req.method,
    requestUrl: req.originalUrl,
    ip: req.ip,
    statusCode: err.statusCode,
  };

  logger.error(err.message, logData);

  if (
    process.env.NODE_ENV === "development" ||
    process.env.NODE_ENV === "test"
  ) {
    return res.status(err.statusCode).json({
      success: false,
      status: err.status,
      message: err.message,
      stack: err.stack,
      error: err,
    });
  }

  if (process.env.NODE_ENV === "production") {
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        success: false,
        status: err.status,
        message: err.message,
      });
    }

    return res.status(500).json({
      success: false,
      status: "error",
      message: "An unexpected error has occurred. Please try again later.",
    });
  }
};
