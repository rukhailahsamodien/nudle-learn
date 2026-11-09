// Fails a request cleanly with 503 if it takes too long, instead of leaving the client hanging.
// Also stops work for requests whose client has already disconnected.
const { AppError } = require('../utils/errors');

function requestTimeout(ms) {
  return (req, res, next) => {
    if (req.path.endsWith('/events')) return next(); // long-lived live stream
    const timer = setTimeout(() => {
      if (!res.headersSent) next(new AppError(503, 'TIMEOUT', 'The server took too long to respond. Please try again.'));
    }, ms);
    res.on('finish', () => clearTimeout(timer));
    res.on('close', () => clearTimeout(timer));
    next();
  };
}

module.exports = { requestTimeout };
