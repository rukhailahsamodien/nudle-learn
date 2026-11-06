// Stateless signed tokens (HMAC-SHA256): base64url(payload).signature
const crypto = require('crypto');

function createTokenService(secret, ttlMs) {
  const sign = (data) => crypto.createHmac('sha256', secret).update(data).digest('base64url');
  return {
    issue(user) {
      const payload = Buffer.from(JSON.stringify({ sub: user.id, role: user.role, exp: Date.now() + ttlMs })).toString('base64url');
      return `${payload}.${sign(payload)}`;
    },
    verify(token) {
      const [payload, sig] = String(token || '').split('.');
      if (!payload || !sig) return null;
      const expected = sign(payload);
      if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
      try {
        const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
        return data.exp > Date.now() ? data : null;
      } catch { return null; }
    },
  };
}

module.exports = { createTokenService };
