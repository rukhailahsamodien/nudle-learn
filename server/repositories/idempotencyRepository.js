// Stores the response to a request made with an Idempotency-Key so a retried request gets the same answer.
module.exports = (db) => ({
  find: (key, userId) => db.prepare('SELECT * FROM idempotency_keys WHERE key = ? AND user_id = ?').get(key, userId),
  save: (key, userId, route, status, body) => db.prepare('INSERT OR IGNORE INTO idempotency_keys (key, user_id, route, status, body) VALUES (?, ?, ?, ?, ?)')
    .run(key, userId, route, status, JSON.stringify(body)),
  purgeOlderThanHours: (h) => db.prepare(`DELETE FROM idempotency_keys WHERE created_at < datetime('now', ?)`).run(`-${h} hours`).changes,
});
