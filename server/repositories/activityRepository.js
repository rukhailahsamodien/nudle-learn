// Data access for activities.
module.exports = (db) => ({
  findById: (id) => db.prepare('SELECT * FROM activities WHERE id = ?').get(id),
  listWithStats: () => db.prepare(`SELECT a.*, COUNT(s.id) AS assigned,
      COALESCE(SUM(s.status = 'completed'), 0) AS completed,
      COALESCE(SUM(s.status = 'in_progress'), 0) AS in_progress,
      ROUND(AVG(CASE WHEN s.status = 'completed' THEN s.best_score END)) AS avg_score
    FROM activities a LEFT JOIN assignments s ON s.activity_id = a.id
    GROUP BY a.id ORDER BY a.created_at DESC, a.id DESC`).all(),
  create: (a, userId) => db.prepare(`INSERT INTO activities (title, description, type, subject, duration_min, pass_mark, content, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(a.title, a.description, a.type, a.subject, a.duration_min, a.pass_mark, JSON.stringify(a.content), userId).lastInsertRowid,
  update: (id, a) => db.prepare(`UPDATE activities SET title = ?, description = ?, type = ?, subject = ?, duration_min = ?, pass_mark = ?, content = ? WHERE id = ?`)
    .run(a.title, a.description, a.type, a.subject, a.duration_min, a.pass_mark, JSON.stringify(a.content), id),
  remove: (id) => db.prepare('DELETE FROM activities WHERE id = ?').run(id).changes,
});
