// Data access for assignments, attempts and simulation runs.
const WITH_ACTIVITY = `SELECT s.*, a.title, a.description, a.type, a.subject, a.duration_min, a.pass_mark
  FROM assignments s JOIN activities a ON a.id = s.activity_id`;

module.exports = (db) => ({
  findById: (id) => db.prepare('SELECT * FROM assignments WHERE id = ?').get(id),
  findForLearner: (id, learnerId) => db.prepare(`SELECT s.*, a.title, a.description, a.type, a.subject, a.duration_min, a.pass_mark, a.content
    FROM assignments s JOIN activities a ON a.id = s.activity_id WHERE s.id = ? AND s.learner_id = ?`).get(id, learnerId),
  listForLearner: (learnerId) => db.prepare(`${WITH_ACTIVITY} WHERE s.learner_id = ?
    ORDER BY CASE s.status WHEN 'in_progress' THEN 0 WHEN 'assigned' THEN 1 ELSE 2 END, s.due_date IS NULL, s.due_date, s.id`).all(learnerId),
  listForLearnerAdmin: (learnerId) => db.prepare(`${WITH_ACTIVITY} WHERE s.learner_id = ? ORDER BY s.assigned_at DESC, s.id DESC`).all(learnerId),
  listForActivity: (activityId) => db.prepare(`SELECT s.*, u.name, u.email, u.cohort, u.active FROM assignments s
    JOIN users u ON u.id = s.learner_id WHERE s.activity_id = ? ORDER BY u.name COLLATE NOCASE`).all(activityId),

  insertIfMissing: (activityId, learnerId, dueDate) =>
    db.prepare('INSERT OR IGNORE INTO assignments (activity_id, learner_id, due_date) VALUES (?, ?, ?)').run(activityId, learnerId, dueDate).changes,
  remove: (id) => db.prepare('DELETE FROM assignments WHERE id = ?').run(id).changes,
  markStarted: (id) => db.prepare("UPDATE assignments SET status = 'in_progress', started_at = datetime('now') WHERE id = ? AND status = 'assigned'").run(id),
  recordResult: (id, { score, passed }) => db.prepare(`UPDATE assignments SET
      score = ?, best_score = MAX(COALESCE(best_score, 0), ?), attempts = attempts + 1,
      started_at = COALESCE(started_at, datetime('now')),
      status = CASE WHEN ? = 1 OR status = 'completed' THEN 'completed' ELSE 'in_progress' END,
      completed_at = CASE WHEN ? = 1 THEN COALESCE(completed_at, datetime('now')) ELSE completed_at END
    WHERE id = ?`).run(score, score, passed ? 1 : 0, passed ? 1 : 0, id),

  insertAttempt: ({ assignmentId, score, passed, answers, simulationRunId }) =>
    db.prepare('INSERT INTO attempts (assignment_id, score, passed, answers, simulation_run_id) VALUES (?, ?, ?, ?, ?)')
      .run(assignmentId, score, passed ? 1 : 0, JSON.stringify(answers), simulationRunId ?? null).lastInsertRowid,
  attemptsForLearner: (learnerId) => db.prepare(`SELECT t.id, t.score, t.passed, t.submitted_at, a.title, a.type, a.subject
    FROM attempts t JOIN assignments s ON s.id = t.assignment_id JOIN activities a ON a.id = s.activity_id
    WHERE s.learner_id = ? ORDER BY t.submitted_at DESC, t.id DESC`).all(learnerId),

  insertSimulationRun: ({ assignmentId, angle, speed, range, target, hit }) =>
    db.prepare('INSERT INTO simulation_runs (assignment_id, angle, speed, range_m, target_m, hit) VALUES (?, ?, ?, ?, ?, ?)')
      .run(assignmentId, angle, speed, range, target, hit ? 1 : 0).lastInsertRowid,
  findSimulationRun: (id, assignmentId) => db.prepare('SELECT * FROM simulation_runs WHERE id = ? AND assignment_id = ?').get(id, assignmentId),
  latestSimulationRun: (assignmentId) => db.prepare('SELECT * FROM simulation_runs WHERE assignment_id = ? ORDER BY id DESC LIMIT 1').get(assignmentId),
  simulationRunsForAssignment: (assignmentId) => db.prepare('SELECT * FROM simulation_runs WHERE assignment_id = ? ORDER BY id DESC').all(assignmentId),
  countSimulationRuns: (assignmentId) => db.prepare('SELECT COUNT(*) AS c FROM simulation_runs WHERE assignment_id = ?').get(assignmentId).c,
  simulationRunsForLearner: (learnerId) => db.prepare(`SELECT r.*, a.title FROM simulation_runs r
    JOIN assignments s ON s.id = r.assignment_id JOIN activities a ON a.id = s.activity_id
    WHERE s.learner_id = ? ORDER BY r.id DESC`).all(learnerId),
});
