// Password hashing with scrypt + per-user random salt; constant-time comparison.
const crypto = require('crypto');

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  return `${salt}:${crypto.scryptSync(password, salt, 64).toString('hex')}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = String(stored || '').split(':');
  if (!salt || !hash) return false;
  const expected = Buffer.from(hash, 'hex');
  const actual = crypto.scryptSync(password, salt, expected.length);
  return crypto.timingSafeEqual(actual, expected);
}

// Used when a login email does not exist, so response time doesn't reveal which emails are registered.
const DUMMY_HASH = hashPassword('dummy-password-for-timing');

module.exports = { hashPassword, verifyPassword, DUMMY_HASH };
