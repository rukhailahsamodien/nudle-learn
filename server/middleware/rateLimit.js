// In-memory limiter for failed logins (per IP + email) to slow down password guessing.
const { tooMany } = require('../utils/errors');

function createLoginLimiter({ windowMs, max }) {
  const hits = new Map();
  const key = (req) => `${req.ip}|${String(req.body?.email || '').toLowerCase()}`;
  const fresh = (k) => {
    const e = hits.get(k);
    if (e && e.reset < Date.now()) { hits.delete(k); return null; }
    return e;
  };
  return {
    check: (req, res, next) => {
      const e = fresh(key(req));
      if (e && e.count >= max) {
        res.set('Retry-After', String(Math.ceil((e.reset - Date.now()) / 1000)));
        return next(tooMany('Too many failed login attempts. Please try again later.'));
      }
      next();
    },
    fail(req) {
      const k = key(req); const e = fresh(k);
      if (e) e.count++; else hits.set(k, { count: 1, reset: Date.now() + windowMs });
    },
    reset: (req) => hits.delete(key(req)),
  };
}

module.exports = { createLoginLimiter };
