// Aggregate queries for dashboards. Definitions are documented in services/statsService.js.
module.exports = (db) => ({
  learnerCounts: () => db.prepare(`SELECT COUNT(*) AS total, COALESCE(SUM(active), 0) AS active
    FROM users WHERE role = 'learner'`).get(),
  activityCount: () => db.prepare('SELECT COUNT(*) AS c FROM activities').get().c,
  // Only assignments belonging to ACTIVE learners count towards live statistics.
  assignmentCounts: () => db.prepare(`SELECT COUNT(*) AS total,
      COALESCE(SUM(s.status = 'completed'), 0) AS completed,
      COALESCE(SUM(s.status = 'in_progress'), 0) AS in_progress,
      COALESCE(SUM(s.status = 'assigned'), 0) AS not_started,
      COALESCE(SUM(s.status != 'completed' AND s.due_date IS NOT NULL AND s.due_date < date('now')), 0) AS overdue,
      COUNT(DISTINCT s.activity_id) AS distinct_activities,
      AVG(CASE WHEN s.status = 'completed' THEN s.best_score END) AS avg_score
    FROM assignments s JOIN users u ON u.id = s.learner_id WHERE u.active = 1`).get(),
  bySubject: () => db.prepare(`SELECT COALESCE(NULLIF(a.subject, ''), 'General') AS subject,
      COUNT(s.id) AS assigned, COALESCE(SUM(s.status = 'completed'), 0) AS completed
    FROM activities a JOIN assignments s ON s.activity_id = a.id JOIN users u ON u.id = s.learner_id
    WHERE u.active = 1 GROUP BY 1 ORDER BY 1`).all(),
  recentCompletions: (limit = 6) => db.prepare(`SELECT s.completed_at, s.best_score AS score, u.name AS learner, a.title AS activity
    FROM assignments s JOIN users u ON u.id = s.learner_id JOIN activities a ON a.id = s.activity_id
    WHERE s.status = 'completed' ORDER BY s.completed_at DESC LIMIT ?`).all(limit),
  simulationTotals: () => db.prepare(`SELECT COUNT(*) AS runs, COALESCE(SUM(hit), 0) AS hits FROM simulation_runs`).get(),
});
