// Read-only aggregate queries for the analytics page. Live figures exclude deactivated learners.
const ACTIVE = "JOIN users u ON u.id = s.learner_id AND u.active = 1";

module.exports = (db) => ({
  completionsByDay: (days) => db.prepare(`SELECT date(s.completed_at) AS day, COUNT(*) AS n FROM assignments s ${ACTIVE}
    WHERE s.status = 'completed' AND s.completed_at >= date('now', ?) GROUP BY day ORDER BY day`).all(`-${days - 1} days`),
  attemptsByDay: (days) => db.prepare(`SELECT date(t.submitted_at) AS day, COUNT(*) AS n, ROUND(AVG(t.score)) AS avg_score
    FROM attempts t JOIN assignments s ON s.id = t.assignment_id ${ACTIVE}
    WHERE t.submitted_at >= date('now', ?) GROUP BY day ORDER BY day`).all(`-${days - 1} days`),
  bestScores: () => db.prepare(`SELECT s.best_score AS score FROM assignments s ${ACTIVE}
    WHERE s.status = 'completed' AND s.best_score IS NOT NULL`).all().map(r => r.score),
  activityPerformance: () => db.prepare(`SELECT a.id, a.title, a.type, COUNT(s.id) AS assigned,
      COALESCE(SUM(s.status = 'completed'), 0) AS completed,
      ROUND(AVG(CASE WHEN s.status = 'completed' THEN s.best_score END)) AS avg_score,
      ROUND(AVG(CASE WHEN s.attempts > 0 THEN s.attempts END), 1) AS avg_attempts
    FROM activities a LEFT JOIN assignments s ON s.activity_id = a.id
      AND s.learner_id IN (SELECT id FROM users WHERE active = 1)
    GROUP BY a.id ORDER BY a.title COLLATE NOCASE`).all(),
  cohortPerformance: () => db.prepare(`SELECT COALESCE(NULLIF(u.cohort, ''), 'No cohort') AS cohort, COUNT(DISTINCT u.id) AS learners,
      COUNT(s.id) AS assigned, COALESCE(SUM(s.status = 'completed'), 0) AS completed,
      ROUND(AVG(CASE WHEN s.status = 'completed' THEN s.best_score END)) AS avg_score
    FROM users u LEFT JOIN assignments s ON s.learner_id = u.id
    WHERE u.role = 'learner' AND u.active = 1 GROUP BY 1 ORDER BY 1`).all(),
  simulationPerformance: () => db.prepare(`SELECT a.id, a.title, COUNT(r.id) AS runs, COALESCE(SUM(r.hit), 0) AS hits,
      COUNT(DISTINCT r.assignment_id) AS learners
    FROM activities a LEFT JOIN assignments s ON s.activity_id = a.id
      LEFT JOIN simulation_runs r ON r.assignment_id = s.id
    WHERE a.type = 'simulation' GROUP BY a.id ORDER BY a.title COLLATE NOCASE`).all(),
  topLearners: (limit) => db.prepare(`SELECT u.id, u.name, u.cohort, COUNT(s.id) AS assigned,
      COALESCE(SUM(s.status = 'completed'), 0) AS completed,
      ROUND(AVG(CASE WHEN s.status = 'completed' THEN s.best_score END)) AS avg_score
    FROM users u JOIN assignments s ON s.learner_id = u.id
    WHERE u.role = 'learner' AND u.active = 1 GROUP BY u.id
    ORDER BY (1.0 * completed / COUNT(s.id)) DESC, avg_score DESC LIMIT ?`).all(limit),
  learnersForReport: () => db.prepare(`SELECT u.id, u.name, u.email, u.cohort, u.active, u.last_login,
      COUNT(s.id) AS assigned, COALESCE(SUM(s.status = 'completed'), 0) AS completed,
      COALESCE(SUM(s.status = 'in_progress'), 0) AS in_progress,
      COALESCE(SUM(s.status != 'completed' AND s.due_date IS NOT NULL AND s.due_date < date('now')), 0) AS overdue,
      ROUND(AVG(CASE WHEN s.status = 'completed' THEN s.best_score END)) AS avg_score,
      COALESCE(SUM(s.attempts), 0) AS attempts
    FROM users u LEFT JOIN assignments s ON s.learner_id = u.id
    WHERE u.role = 'learner' GROUP BY u.id ORDER BY u.name COLLATE NOCASE`).all(),
});
