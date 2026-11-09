// Central configuration. All environment access happens here.
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..', '..');
const DATA_DIR = process.env.DATA_DIR || path.join(ROOT, 'data');

// Use APP_SECRET if provided; otherwise generate one once and persist it so
// sessions survive restarts without hard-coding a secret in the repository.
function loadSecret() {
  if (process.env.APP_SECRET) return process.env.APP_SECRET;
  const file = path.join(DATA_DIR, '.secret');
  try { return fs.readFileSync(file, 'utf8').trim(); } catch { /* create below */ }
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const secret = crypto.randomBytes(32).toString('hex');
  fs.writeFileSync(file, secret, { mode: 0o600 });
  return secret;
}

module.exports = {
  port: Number(process.env.PORT) || 3000,
  dbFile: process.env.DB_FILE || path.join(DATA_DIR, 'nudle.db'),
  publicDir: path.join(ROOT, 'public'),
  loadSecret,
  tokenTtlMs: 1000 * 60 * 60 * 12,           // 12 hours
  loginRateLimit: { windowMs: 15 * 60 * 1000, max: 10 }, // 10 failed logins / 15 min per IP+email
  gravity: 9.8,
  requestTimeoutMs: Number(process.env.REQUEST_TIMEOUT_MS) || 15000,
};
