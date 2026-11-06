// Shapes database rows into API responses (never leaks password hashes or answer keys).
const toPublicUser = (u) => u && ({
  id: u.id, name: u.name, email: u.email, role: u.role, cohort: u.cohort,
  active: !!u.active, createdAt: u.created_at, lastLogin: u.last_login,
});

function toActivity(row, { hideAnswers = false } = {}) {
  if (!row) return row;
  let content;
  try { content = JSON.parse(row.content); } catch { content = {}; }
  if (hideAnswers && Array.isArray(content.questions)) content.questions = content.questions.map(({ answer, ...q }) => q);
  return { ...row, content };
}

const pct = (part, whole) => (whole ? Math.round((part / whole) * 100) : 0);

// Summary of a list of assignment rows.
function summarize(rows) {
  const total = rows.length;
  const completed = rows.filter(r => r.status === 'completed').length;
  const inProgress = rows.filter(r => r.status === 'in_progress').length;
  const scores = rows.filter(r => r.status === 'completed' && r.best_score != null).map(r => r.best_score);
  return {
    total, completed, inProgress, notStarted: total - completed - inProgress,
    completionRate: pct(completed, total),
    averageScore: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
  };
}

module.exports = { toPublicUser, toActivity, summarize, pct };
