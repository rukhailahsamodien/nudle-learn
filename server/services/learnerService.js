const v = require('../utils/validate');
const { badRequest, conflict, notFound } = require('../utils/errors');
const { hashPassword } = require('../utils/password');
const { toPublicUser, summarize, pct } = require('./mappers');

function parseLearner(body, { isNew }) {
  v.object(body, 'Request body');
  return {
    name: v.string(body.name, 'Name', { min: 2, max: 100 }),
    email: v.email(body.email),
    cohort: v.string(body.cohort, 'Cohort', { max: 50, required: false }) || null,
    password: v.password(body.password, { required: isNew }),
  };
}

module.exports = ({ users, assignments }) => {
  const getLearnerOr404 = (id) => {
    const l = users.findLearner(v.id(id, 'learner id'));
    if (!l) throw notFound('Learner');
    return l;
  };

  return {
    list(query) {
      const filters = {
        q: v.string(query.q, 'Search', { max: 100, required: false }),
        status: query.status ? v.oneOf(query.status, 'Status', ['all', 'active', 'inactive']) : 'all',
        cohort: v.string(query.cohort, 'Cohort', { max: 50, required: false }),
      };
      return users.searchLearners(filters).map(r => ({
        ...toPublicUser(r), assigned: r.assigned, completed: r.completed,
        avgScore: r.avg_score, progress: pct(r.completed, r.assigned),
      }));
    },
    cohorts: () => users.cohorts(),

    create(body) {
      const data = parseLearner(body, { isNew: true });
      if (users.emailTaken(data.email)) throw conflict('A user with this email already exists');
      const id = users.create({ ...data, role: 'learner', passwordHash: hashPassword(data.password) });
      return toPublicUser(users.findById(id));
    },

    update(id, body) {
      const learner = getLearnerOr404(id);
      const data = parseLearner(body, { isNew: false });
      if (users.emailTaken(data.email, learner.id)) throw conflict('A user with this email already exists');
      users.update(learner.id, data);
      if (data.password) users.setPassword(learner.id, hashPassword(data.password));
      return toPublicUser(users.findById(learner.id));
    },

    setActive(id, body) {
      const learner = getLearnerOr404(id);
      if (typeof body?.active !== 'boolean') throw badRequest('"active" must be true or false');
      users.setActive(learner.id, body.active);
      return toPublicUser(users.findById(learner.id));
    },

    detail(id) {
      const learner = getLearnerOr404(id);
      const rows = assignments.listForLearnerAdmin(learner.id);
      return {
        learner: toPublicUser(learner),
        assignments: rows,
        attempts: assignments.attemptsForLearner(learner.id),
        simulationRuns: assignments.simulationRunsForLearner(learner.id),
        summary: summarize(rows),
      };
    },
  };
};
