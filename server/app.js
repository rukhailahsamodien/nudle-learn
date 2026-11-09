// Composition root: builds repositories → services → routes and wires the Express app.
const express = require('express');
const path = require('path');
const config = require('./config');
const { createTokenService } = require('./utils/token');
const { authenticate, requireRole } = require('./middleware/auth');
const { createLoginLimiter } = require('./middleware/rateLimit');
const securityHeaders = require('./middleware/security');
const { errorHandler, notFoundApi } = require('./middleware/errorHandler');
const { idempotency } = require('./middleware/idempotency');
const { requestTimeout } = require('./middleware/timeout');
const { createEventBus } = require('./services/eventBus');

function createApp(db, { secret, loginRateLimit = config.loginRateLimit, requestTimeoutMs = config.requestTimeoutMs, heartbeatMs } = {}) {
  // Data access layer
  const repos = {
    users: require('./repositories/userRepository')(db),
    activities: require('./repositories/activityRepository')(db),
    assignments: require('./repositories/assignmentRepository')(db),
    stats: require('./repositories/statsRepository')(db),
    audit: require('./repositories/auditRepository')(db),
    progress: require('./repositories/progressRepository')(db),
    analytics: require('./repositories/analyticsRepository')(db),
    idempotencyKeys: require('./repositories/idempotencyRepository')(db),
  };
  const events = createEventBus();
  // Business logic layer
  const tokens = createTokenService(secret || config.loadSecret(), config.tokenTtlMs);
  const services = {
    authService: require('./services/authService')({ ...repos, tokens }),
    learnerService: require('./services/learnerService')(repos),
    activityService: require('./services/activityService')({ db, ...repos }),
    learningService: require('./services/learningService')({ db, ...repos, gravity: config.gravity }),
    statsService: require('./services/statsService')(repos),
    auditService: require('./services/auditService')({ ...repos, events }),
    analyticsService: require('./services/analyticsService')(repos),
    reportService: require('./services/reportService')(repos),
  };
  const auth = authenticate(services.authService);
  const loginLimiter = createLoginLimiter(loginRateLimit);

  const app = express();
  app.disable('x-powered-by');
  app.use(securityHeaders);
  app.use('/api', requestTimeout(requestTimeoutMs));
  app.use(express.json({ limit: '200kb' }));
  const idem = idempotency(repos.idempotencyKeys);

  // HTTP layer
  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
  app.use('/api/auth', require('./routes/authRoutes')({ ...services, auth, loginLimiter }));
  app.use('/api/me', require('./routes/learnerRoutes')({ ...services, auth, requireRole, idem }));
  app.use('/api', require('./routes/liveRoutes')({ auth, requireRole, events, heartbeatMs }));
  app.use('/api', require('./routes/adminRoutes')({ ...services, auth, requireRole }));
  app.use('/api', notFoundApi);

  // Front end (single-page app)
  app.use(express.static(config.publicDir));
  app.get('*', (req, res) => res.sendFile(path.join(config.publicDir, 'index.html')));

  app.use(errorHandler);
  app.locals.events = events; // exposed for tests
  return app;
}

module.exports = { createApp };
