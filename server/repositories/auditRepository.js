// Data access for the audit log (append-only: there is no update or delete).
module.exports = (db) => ({
  insert: (e) => db.prepare(`INSERT INTO audit_log (actor_id, actor_name, actor_role, action, entity, entity_id, summary, details, ip)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(e.actorId ?? null, e.actorName ?? null, e.actorRole ?? null, e.action, e.entity ?? null,
    e.entityId ?? null, e.summary, e.details ? JSON.stringify(e.details) : null, e.ip ?? null).lastInsertRowid,

  search({ action, actorId, entity, entityId, q, from, to, limit, offset }) {
    const where = []; const params = [];
    if (action) { where.push('action LIKE ?'); params.push(`${action}%`); }
    if (actorId) { where.push('actor_id = ?'); params.push(actorId); }
    if (entity) { where.push('entity = ?'); params.push(entity); }
    if (entityId) { where.push('entity_id = ?'); params.push(entityId); }
    if (q) { where.push("(summary LIKE ? ESCAPE '\\' OR actor_name LIKE ? ESCAPE '\\')"); const like = `%${q.replace(/[\\%_]/g, '\\$&')}%`; params.push(like, like); }
    if (from) { where.push('date(created_at) >= ?'); params.push(from); }
    if (to) { where.push('date(created_at) <= ?'); params.push(to); }
    const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const total = db.prepare(`SELECT COUNT(*) AS c FROM audit_log ${w}`).get(...params).c;
    const rows = db.prepare(`SELECT * FROM audit_log ${w} ORDER BY id DESC LIMIT ? OFFSET ?`).all(...params, limit, offset);
    return { total, rows };
  },
  actions: () => db.prepare('SELECT DISTINCT action FROM audit_log ORDER BY action').all().map(r => r.action),
  forLearner: (learnerId, limit = 50) => db.prepare(`SELECT * FROM audit_log
    WHERE actor_id = ? OR (entity = 'learner' AND entity_id = ?) ORDER BY id DESC LIMIT ?`).all(learnerId, learnerId, limit),
});
