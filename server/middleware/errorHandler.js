// Converts any thrown error into a consistent JSON response:
// { error: "<message>", code: "<CODE>", details?: {...} }
const { AppError } = require('../utils/errors');

function notFoundApi(req, res) {
  res.status(404).json({ error: 'Endpoint not found', code: 'NOT_FOUND' });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: err.message, code: err.code, ...(err.details ? { details: err.details } : {}) });
  }
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Request body is not valid JSON', code: 'INVALID_JSON' });
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Request body is too large', code: 'PAYLOAD_TOO_LARGE' });
  if (/UNIQUE constraint failed/.test(err.message)) return res.status(409).json({ error: 'That record already exists', code: 'CONFLICT' });
  if (/CHECK constraint failed|FOREIGN KEY constraint failed/.test(err.message)) return res.status(400).json({ error: 'Invalid data', code: 'VALIDATION_ERROR' });
  // Unexpected: log full details server-side, never leak internals to the client.
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`, err);
  res.status(500).json({ error: 'Something went wrong on our side', code: 'INTERNAL_ERROR' });
}

module.exports = { errorHandler, notFoundApi };
