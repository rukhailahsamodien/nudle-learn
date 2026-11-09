// Exportable learner performance reports (CSV).
const { notFound } = require('../utils/errors');
const v = require('../utils/validate');
const { pct } = require('./mappers');

// RFC 4180 quoting + protection against spreadsheet formula injection (=, +, -, @ at the start).
function cell(value) {
  if (value == null) return '';
  let s = String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
const toCsv = (header, rows) => '\uFEFF' + [header, ...rows].map(r => r.map(cell).join(',')).join('\r\n') + '\r\n';
const stamp = () => new Date().toISOString().slice(0, 10);
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'learner';

module.exports = ({ analytics, users, assignments }) => ({
  allLearnersCsv() {
    const rows = analytics.learnersForReport().map(l => [
      l.name, l.email, l.cohort || '', l.active ? 'Active' : 'Deactivated', l.assigned, l.completed, l.in_progress,
      l.overdue, `${pct(l.completed, l.assigned)}%`, l.avg_score == null ? '' : `${l.avg_score}%`, l.attempts, l.last_login || 'Never']);
    return {
      filename: `nudle-learner-performance-${stamp()}.csv`,
      csv: toCsv(['Name', 'Email', 'Cohort', 'Status', 'Assigned', 'Completed', 'In progress', 'Overdue', 'Completion rate', 'Average score', 'Attempts', 'Last login'], rows),
      count: rows.length,
    };
  },
  learnerCsv(id) {
    const l = users.findLearner(v.id(id, 'learner id'));
    if (!l) throw notFound('Learner');
    const asg = assignments.listForLearnerAdmin(l.id);
    const status = (a) => (a.status !== 'completed' && a.due_date && a.due_date < stamp()) ? 'Overdue' : { completed: 'Completed', in_progress: 'In progress', assigned: 'Not started' }[a.status];
    const rows = asg.map(a => [a.title, a.type, a.subject, status(a), a.due_date || '', a.best_score ?? '', a.score ?? '', a.attempts, a.started_at || '', a.completed_at || '']);
    const header = [['Learner', l.name], ['Email', l.email], ['Cohort', l.cohort || ''], ['Generated', new Date().toISOString()], []];
    const body = toCsv(['Activity', 'Type', 'Subject', 'Status', 'Due date', 'Best score', 'Latest score', 'Attempts', 'Started', 'Completed'], rows);
    return { filename: `nudle-report-${slug(l.name)}-${stamp()}.csv`, csv: '\uFEFF' + header.map(r => r.map(cell).join(',')).join('\r\n') + '\r\n' + body.slice(1), learner: l };
  },
});

module.exports.cell = cell;
