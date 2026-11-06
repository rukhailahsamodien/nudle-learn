// Composition root: builds repositories → services → routes and wires the Express app.
const express = require('express');
const path = require('path');
const config = require('./config');
const { createTokenService } = require('./utils/token');
const { authenticate, requireRole } = require('./middleware/auth');
const { createLoginLimiter } = require('./middleware/rateLimit');
const securityHeaders = require('./middleware/security');
const { errorHandler, notFoundApi } = require('./middleware/errorHandler');

function createApp(db, { secret, loginRateLimit = config.loginRateLimit } = {}) {
  // Data access layer
  const repos = {
    users: require('./repositories/userRepository')(db),
    activities: require('./repositories/activityRepository')(db),
    assignments: require('./repositories/assignmentRepository')(db),
    stats: require('./repositories/statsRepository')(db),
  };
  // Business logic layer
  const tokens = createTokenService(secret || config.loadSecret(), config.tokenTtlMs);
  const services = {
    authService: require('./services/authService')({ ...repos, tokens }),
    learnerService: require('./services/learnerService')(repos),
    activityService: require('./services/activityService')({ db, ...repos }),
    learningService: require('./services/learningService')({ db, ...repos, gravity: config.gravity }),
    statsService: require('./services/statsService')(repos),
  };
  const auth = authenticate(services.authService);
  const loginLimiter = createLoginLimiter(loginRateLimit);

  const app = express();
  app.disable('x-powered-by');
  app.use(securityHeaders);
  app.use(express.json({ limit: '200kb' }));

  // HTTP layer
  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
  app.use('/api/auth', require('./routes/authRoutes')({ ...services, auth, loginLimiter }));
  app.use('/api/me', require('./routes/learnerRoutes')({ ...services, auth, requireRole }));
  app.use('/api', require('./routes/adminRoutes')({ ...services, auth, requireRole }));
  app.use('/api', notFoundApi);

  // Front end (single-page app)
  app.use(express.static(config.publicDir));
  app.get('*', (req, res) => res.sendFile(path.join(config.publicDir, 'index.html')));

  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
