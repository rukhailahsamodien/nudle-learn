// Saved, in-progress state of an assignment (slider positions, chosen answers) so learners can resume.
module.exports = (db) => ({
  get(assignmentId) {
    const row = db.prepare('SELECT state, updated_at FROM assignment_progress WHERE assignment_id = ?').get(assignmentId);
    if (!row) return null;
    try { return { ...JSON.parse(row.state), savedAt: row.updated_at }; } catch { return null; }
  },
  save: (assignmentId, state) => db.prepare(`INSERT INTO assignment_progress (assignment_id, state, updated_at) VALUES (?, ?, datetime('now'))
    ON CONFLICT(assignment_id) DO UPDATE SET state = excluded.state, updated_at = excluded.updated_at`).run(assignmentId, JSON.stringify(state)),
  clear: (assignmentId) => db.prepare('DELETE FROM assignment_progress WHERE assignment_id = ?').run(assignmentId),
});
