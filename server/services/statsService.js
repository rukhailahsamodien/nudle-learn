// Dashboard statistics.
// Definitions (kept in one place so numbers are consistent everywhere):
//  - totalLearners:      all learner accounts (active + deactivated)
//  - activeLearners:     learner accounts that are not deactivated
//  - assignedActivities: assignments (learner × activity) held by ACTIVE learners
//  - completionRate:     completed ÷ assignedActivities, rounded to whole %
//  - averageScore:       mean best score of completed assignments (active learners)
//  - overdue:            not completed and due date before today
// Deactivated learners are excluded from live progress figures so they don't drag rates down.
const { pct } = require('./mappers');

module.exports = ({ stats }) => ({
  dashboard() {
    const l = stats.learnerCounts();
    const a = stats.assignmentCounts();
    const sim = stats.simulationTotals();
    return {
      totalLearners: l.total,
      activeLearners: l.active,
      inactiveLearners: l.total - l.active,
      totalActivities: stats.activityCount(),
      assignedActivities: a.total,
      activitiesInUse: a.distinct_activities,
      completed: a.completed,
      inProgress: a.in_progress,
      notStarted: a.not_started,
      overdue: a.overdue,
      completionRate: pct(a.completed, a.total),
      averageScore: a.avg_score == null ? null : Math.round(a.avg_score),
      bySubject: stats.bySubject().map(r => ({ ...r, completionRate: pct(r.completed, r.assigned) })),
      recent: stats.recentCompletions(),
      simulation: { runs: sim.runs, hits: sim.hits, hitRate: pct(sim.hits, sim.runs) },
    };
  },
});
