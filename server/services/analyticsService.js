// Visual analytics: time series, distributions and comparisons for the analytics page.
const v = require('../utils/validate');
const { pct } = require('./mappers');

const BUCKETS = [[0, 49, '0–49'], [50, 59, '50–59'], [60, 69, '60–69'], [70, 79, '70–79'], [80, 89, '80–89'], [90, 100, '90–100']];

// Fills missing days with zero so charts have a continuous x-axis.
function series(rows, days, key = 'n') {
  const map = new Map(rows.map(r => [r.day, r]));
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    out.push({ day: d, value: map.get(d)?.[key] ?? 0 });
  }
  return out;
}

module.exports = ({ analytics }) => ({
  overview(query = {}) {
    const days = v.int(query.days, 'Days', { min: 7, max: 90, fallback: 30 });
    const scores = analytics.bestScores();
    const attempts = analytics.attemptsByDay(days);
    return {
      days,
      completionsByDay: series(analytics.completionsByDay(days), days),
      attemptsByDay: series(attempts, days),
      scoreDistribution: BUCKETS.map(([lo, hi, label]) => ({ label, count: scores.filter(s => s >= lo && s <= hi).length })),
      activityPerformance: analytics.activityPerformance().map(a => ({ ...a, completionRate: pct(a.completed, a.assigned) })),
      cohortPerformance: analytics.cohortPerformance().map(c => ({ ...c, completionRate: pct(c.completed, c.assigned) })),
      simulationPerformance: analytics.simulationPerformance().map(s => ({ ...s, hitRate: pct(s.hits, s.runs) })),
      topLearners: analytics.topLearners(5).map(l => ({ ...l, completionRate: pct(l.completed, l.assigned) })),
      totals: {
        scoredCompletions: scores.length,
        medianScore: scores.length ? [...scores].sort((a, b) => a - b)[Math.floor((scores.length - 1) / 2)] : null,
        attemptsInPeriod: attempts.reduce((n, r) => n + r.n, 0),
      },
    };
  },
});
