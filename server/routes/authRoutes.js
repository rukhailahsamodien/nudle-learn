const express = require('express');
const { toPublicUser } = require('../services/mappers');

module.exports = ({ authService, auditService, auth, loginLimiter }) => {
  const r = express.Router();
  r.post('/login', loginLimiter.check, (req, res, next) => {
    try {
      const result = authService.login(req.body || {});
      loginLimiter.reset(req);
      auditService.record({ actor: result.user, action: 'auth.login', entity: 'user', entityId: result.user.id, summary: `${result.user.name} logged in`, ip: req.ip, live: false });
      res.json(result);
    } catch (e) {
      if (e.status === 401 || e.status === 403) {
        // Only the attempted email is stored – never the password.
        const email = typeof req.body?.email === 'string' ? req.body.email.slice(0, 254) : '';
        auditService.record({ actor: null, action: 'auth.login_failed', entity: 'user', summary: `Failed login for ${email || 'unknown email'}`, details: { reason: e.code }, ip: req.ip, live: false });
      }
      if (e.status === 401) loginLimiter.fail(req);
      next(e);
    }
  });
  r.get('/me', auth, (req, res) => res.json({ user: toPublicUser(req.user) }));
  return r;
};
