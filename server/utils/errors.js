// Typed application errors. Thrown by services, translated to HTTP by the error middleware.
class AppError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status; this.code = code; this.details = details;
  }
}
const badRequest = (msg, details) => new AppError(400, 'VALIDATION_ERROR', msg, details);
const unauthorized = (msg = 'Not authenticated') => new AppError(401, 'UNAUTHENTICATED', msg);
const forbidden = (msg = 'You do not have permission to do this') => new AppError(403, 'FORBIDDEN', msg);
const notFound = (what = 'Resource') => new AppError(404, 'NOT_FOUND', `${what} not found`);
const conflict = (msg) => new AppError(409, 'CONFLICT', msg);
const tooMany = (msg) => new AppError(429, 'RATE_LIMITED', msg);

module.exports = { AppError, badRequest, unauthorized, forbidden, notFound, conflict, tooMany };
