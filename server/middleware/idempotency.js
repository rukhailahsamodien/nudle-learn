// Idempotency: a client may send an "Idempotency-Key" header with a POST. If the same key is
// seen again (e.g. the network dropped and the browser retried), the stored response is replayed
// instead of performing the action twice — so a submission or launch is never double-counted.
const { badRequest } = require('../utils/errors');
const KEY_RE = /^[A-Za-z0-9_-]{8,100}$/;

function idempotency(repo) {
  let calls = 0;
  return (req, res, next) => {
    const key = req.get('Idempotency-Key');
    if (!key) return next();
    if (!KEY_RE.test(key)) return next(badRequest('Idempotency-Key must be 8–100 letters, digits, - or _'));
    if (++calls % 200 === 0) repo.purgeOlderThanHours(24);
    const prior = repo.find(key, req.user.id);
    if (prior) {
      if (prior.route !== req.originalUrl) return next(badRequest('This Idempotency-Key was already used for a different request'));
      res.set('Idempotent-Replayed', 'true');
      return res.status(prior.status).json(JSON.parse(prior.body));
    }
    const json = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode < 500) repo.save(key, req.user.id, req.originalUrl, res.statusCode, body);
      return json(body);
    };
    next();
  };
}

module.exports = { idempotency };
