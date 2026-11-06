// Authentication (who are you?) and role-based authorisation (are you allowed?).
const { unauthorized, forbidden } = require('../utils/errors');

function authenticate(authService) {
  return (req, res, next) => {
    const header = req.headers.authorization || '';
    if (!header.startsWith('Bearer ')) return next(unauthorized());
    try { req.user = authService.authenticate(header.slice(7)); next(); }
    catch (e) { next(e); }
  };
}

const requireRole = (...roles) => (req, res, next) =>
  roles.includes(req.user?.role) ? next() : next(forbidden());

module.exports = { authenticate, requireRole };
