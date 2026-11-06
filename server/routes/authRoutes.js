const express = require('express');
const { toPublicUser } = require('../services/mappers');

module.exports = ({ authService, auth, loginLimiter }) => {
  const r = express.Router();
  r.post('/login', loginLimiter.check, (req, res, next) => {
    try {
      const result = authService.login(req.body || {});
      loginLimiter.reset(req);
      res.json(result);
    } catch (e) {
      if (e.status === 401) loginLimiter.fail(req);
      next(e);
    }
  });
  r.get('/me', auth, (req, res) => res.json({ user: toPublicUser(req.user) }));
  return r;
};
