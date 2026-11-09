const { openDb } = require('../server/db/connection');
const { seed } = require('../server/db/seed');
const { createApp } = require('../server/app');

// Starts an isolated app on a random port with an in-memory database.
async function startServer({ seedData = true, loginRateLimit, requestTimeoutMs } = {}) {
  const db = openDb(':memory:');
  if (seedData) seed(db);
  const expressApp = createApp(db, { secret: 'test-secret', loginRateLimit, requestTimeoutMs });
  const server = expressApp.listen(0);
  await new Promise(r => server.once('listening', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = async (path, { method = 'GET', body, token, raw } = {}) => {
    const res = await fetch(base + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: raw ?? (body !== undefined ? JSON.stringify(body) : undefined),
    });
    const text = await res.text();
    return { status: res.status, headers: res.headers, data: text ? JSON.parse(text) : null };
  };
  const login = async (email, password) => (await call('/api/auth/login', { method: 'POST', body: { email, password } })).data.token;
  return { db, server, base, call, login, events: expressApp.locals.events, close: () => new Promise(r => { server.closeAllConnections?.(); server.close(r); }) };
}

module.exports = { startServer };
