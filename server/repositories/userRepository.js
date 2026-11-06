// Data access for users. Only SQL lives here – no business rules.
module.exports = (db) => ({
  findById: (id) => db.prepare('SELECT * FROM users WHERE id = ?').get(id),
  findByEmail: (email) => db.prepare('SELECT * FROM users WHERE email = ?').get(email),
  findLearner: (id) => db.prepare("SELECT * FROM users WHERE id = ? AND role = 'learner'").get(id),
  emailTaken: (email, exceptId = 0) => !!db.prepare('SELECT 1 FROM users WHERE email = ? AND id != ?').get(email, exceptId),
  touchLogin: (id) => db.prepare("UPDATE users SET last_login = datetime('now') WHERE id = ?").run(id),

  searchLearners({ q, status, cohort }) {
    const where = ["u.role = 'learner'"]; const params = [];
    if (q) { where.push("(u.name LIKE ? ESCAPE '\\' OR u.email LIKE ? ESCAPE '\\')"); const like = `%${q.replace(/[\\%_]/g, '\\$&')}%`; params.push(like, like); }
    if (status === 'active') where.push('u.active = 1');
    if (status === 'inactive') where.push('u.active = 0');
    if (cohort) { where.push('u.cohort = ?'); params.push(cohort); }
    return db.prepare(`SELECT u.*, COUNT(s.id) AS assigned,
        COALESCE(SUM(s.status = 'completed'), 0) AS completed,
        ROUND(AVG(CASE WHEN s.status = 'completed' THEN s.best_score END)) AS avg_score
      FROM users u LEFT JOIN assignments s ON s.learner_id = u.id
      WHERE ${where.join(' AND ')} GROUP BY u.id ORDER BY u.name COLLATE NOCASE`).all(...params);
  },
  cohorts: () => db.prepare("SELECT DISTINCT cohort FROM users WHERE role = 'learner' AND cohort IS NOT NULL AND cohort != '' ORDER BY cohort").all().map(r => r.cohort),
  activeLearnerIdsInCohort: (cohort) => db.prepare("SELECT id FROM users WHERE role = 'learner' AND active = 1 AND cohort = ?").all(cohort).map(r => r.id),
  learnerIdsAmong(ids) {
    if (!ids.length) return [];
    return db.prepare(`SELECT id FROM users WHERE role = 'learner' AND id IN (${ids.map(() => '?').join(',')})`).all(...ids).map(r => r.id);
  },

  create: ({ name, email, passwordHash, role, cohort }) =>
    db.prepare('INSERT INTO users (name, email, password_hash, role, cohort) VALUES (?, ?, ?, ?, ?)').run(name, email, passwordHash, role, cohort).lastInsertRowid,
  update: (id, { name, email, cohort }) => db.prepare('UPDATE users SET name = ?, email = ?, cohort = ? WHERE id = ?').run(name, email, cohort, id),
  setPassword: (id, hash) => db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, id),
  setActive: (id, active) => db.prepare('UPDATE users SET active = ? WHERE id = ?').run(active ? 1 : 0, id),
});
