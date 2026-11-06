const v = require('../utils/validate');
const { badRequest, notFound } = require('../utils/errors');
const { transaction } = require('../db/connection');
const { toActivity, summarize, pct } = require('./mappers');

const TYPES = ['lesson', 'quiz', 'simulation'];

function parseQuestions(list) {
  if (list == null) return [];
  if (!Array.isArray(list)) throw badRequest('Questions must be a list');
  if (list.length > 50) throw badRequest('An activity can have at most 50 questions');
  return list.map((q, i) => {
    const n = i + 1;
    v.object(q, `Question ${n}`);
    const text = v.string(q.q, `Question ${n} text`, { min: 1, max: 500 });
    if (!Array.isArray(q.options)) throw badRequest(`Question ${n} needs a list of options`);
    const options = q.options.map((o, j) => v.string(o, `Question ${n} option ${j + 1}`, { max: 200, required: false }));
    if (options.length < 2 || options.length > 6 || options.some(o => !o)) throw badRequest(`Question ${n} needs 2–6 non-empty options`);
    const answer = v.int(q.answer, `Question ${n} correct answer`, { min: 0, max: options.length - 1 });
    return { q: text, options, answer };
  });
}

function parseActivity(body) {
  v.object(body, 'Request body');
  const type = v.oneOf(body.type, 'Type', TYPES);
  const raw = body.content && typeof body.content === 'object' ? body.content : {};
  const content = { questions: parseQuestions(raw.questions) };

  if (type === 'quiz' && !content.questions.length) throw badRequest('A quiz needs at least one question');
  if (type === 'lesson') {
    if (!Array.isArray(raw.sections) || !raw.sections.length) throw badRequest('A lesson needs at least one content section');
    content.sections = raw.sections.map((s, i) => ({
      heading: v.string(s?.heading, `Section ${i + 1} heading`, { max: 200, required: false }),
      body: v.string(s?.body, `Section ${i + 1} content`, { min: 1, max: 5000 }),
    }));
  }
  if (type === 'simulation') {
    content.simulation = 'projectile';
    content.targetDistance = v.number(raw.targetDistance ?? 40, 'Target distance', { min: 5, max: 160 });
    content.tolerance = v.number(raw.tolerance ?? 2, 'Tolerance', { min: 0.5, max: 20 });
    content.instructions = v.string(raw.instructions, 'Instructions', { max: 1000, required: false });
  }
  return {
    title: v.string(body.title, 'Title', { min: 3, max: 120 }),
    description: v.string(body.description, 'Description', { max: 1000, required: false }),
    subject: v.string(body.subject, 'Subject', { max: 60, required: false }) || 'General',
    type,
    duration_min: v.int(body.duration_min, 'Duration', { min: 1, max: 600, fallback: 10 }),
    pass_mark: v.int(body.pass_mark, 'Pass mark', { min: 0, max: 100, fallback: 50 }),
    content,
  };
}

module.exports = ({ db, activities, assignments, users }) => {
  const getOr404 = (id) => {
    const a = activities.findById(v.id(id, 'activity id'));
    if (!a) throw notFound('Activity');
    return a;
  };

  return {
    list: () => activities.listWithStats().map(r => ({ ...toActivity(r), completionRate: pct(r.completed, r.assigned) })),
    detail(id) {
      const a = getOr404(id);
      const rows = assignments.listForActivity(a.id);
      return { activity: toActivity(a), assignees: rows, summary: summarize(rows) };
    },
    create(body, userId) {
      const id = activities.create(parseActivity(body), userId);
      return toActivity(activities.findById(id));
    },
    update(id, body) {
      const a = getOr404(id);
      activities.update(a.id, parseActivity(body));
      return toActivity(activities.findById(a.id));
    },
    remove(id) {
      const a = getOr404(id);
      activities.remove(a.id);
    },

    // Assign to explicit learners and/or every active learner in a cohort. Atomic.
    assign(id, body = {}) {
      const a = getOr404(id);
      const dueDate = v.date(body.dueDate, 'Due date');
      if (body.learnerIds != null && !Array.isArray(body.learnerIds)) throw badRequest('learnerIds must be a list');
      let ids = (body.learnerIds || []).map(x => v.id(x, 'learner id'));
      if (body.cohort) ids = ids.concat(users.activeLearnerIdsInCohort(v.string(body.cohort, 'Cohort', { max: 50 })));
      ids = [...new Set(ids)];
      if (!ids.length) throw badRequest('Select at least one learner or cohort');
      const valid = new Set(users.learnerIdsAmong(ids));
      const invalid = ids.filter(x => !valid.has(x));
      if (invalid.length) throw badRequest('Some selected users are not learners', { invalidIds: invalid });
      const created = transaction(db, () => ids.reduce((n, lid) => n + assignments.insertIfMissing(a.id, lid, dueDate), 0));
      return { created, skipped: ids.length - created };
    },
    unassign(id) {
      if (!assignments.remove(v.id(id, 'assignment id'))) throw notFound('Assignment');
    },
  };
};
