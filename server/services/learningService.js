// Learner-facing operations: view assignments, run simulations, submit attempts.
const v = require('../utils/validate');
const { badRequest, notFound } = require('../utils/errors');
const { transaction } = require('../db/connection');
const { toActivity, summarize } = require('./mappers');
const { evaluateLaunch, gradeSubmission } = require('./grading');

module.exports = ({ db, assignments, gravity }) => {
  const getOwnOr404 = (id, learnerId) => {
    const s = assignments.findForLearner(v.id(id, 'assignment id'), learnerId);
    if (!s) throw notFound('Assignment'); // also covers other learners' assignments – no information leak
    return s;
  };

  return {
    list(learnerId) {
      const rows = assignments.listForLearner(learnerId);
      return { assignments: rows, summary: summarize(rows) };
    },
    get(id, learnerId) {
      const s = getOwnOr404(id, learnerId);
      const out = toActivity(s, { hideAnswers: true });
      if (s.type === 'simulation') out.simulationRuns = assignments.simulationRunsForAssignment(s.id).slice(0, 10);
      return out;
    },
    start(id, learnerId) {
      const s = getOwnOr404(id, learnerId);
      assignments.markStarted(s.id);
      return { ok: true };
    },

    // Every launch is evaluated on the server and stored, so results can't be faked client-side.
    runSimulation(id, learnerId, body = {}) {
      const s = getOwnOr404(id, learnerId);
      if (s.type !== 'simulation') throw badRequest('This activity has no simulation');
      const angle = v.number(body.angle, 'Angle', { min: 1, max: 89 });
      const speed = v.number(body.speed, 'Speed', { min: 1, max: 100 });
      const content = toActivity(s).content;
      const result = evaluateLaunch({ angle, speed }, content, gravity);
      const runId = transaction(db, () => {
        assignments.markStarted(s.id);
        return assignments.insertSimulationRun({ assignmentId: s.id, angle, speed, ...result });
      });
      return { id: runId, angle, speed, ...result };
    },

    submit(id, learnerId, body = {}) {
      const s = getOwnOr404(id, learnerId);
      const content = toActivity(s).content;
      const questions = content.questions || [];
      if (!Array.isArray(body.answers ?? [])) throw badRequest('Answers must be a list');
      const answers = (body.answers || []);
      if (answers.length !== questions.length) throw badRequest(`Please answer all ${questions.length} question(s)`);
      const cleanAnswers = answers.map((a, i) => v.int(a, `Answer ${i + 1}`, { min: 0, max: questions[i].options.length - 1 }));

      let run = null;
      if (s.type === 'simulation') {
        run = body.simulationRunId != null
          ? assignments.findSimulationRun(v.id(body.simulationRunId, 'simulation run id'), s.id)
          : assignments.latestSimulationRun(s.id);
        if (!run) throw badRequest('Launch the simulation at least once before submitting');
      }

      const result = gradeSubmission({ type: s.type, questions }, cleanAnswers, run ? !!run.hit : undefined);
      const passed = result.score >= s.pass_mark;
      transaction(db, () => {
        assignments.insertAttempt({ assignmentId: s.id, score: result.score, passed, answers: cleanAnswers, simulationRunId: run?.id });
        assignments.recordResult(s.id, { score: result.score, passed });
      });
      return {
        ...result, passed, passMark: s.pass_mark,
        simulation: run ? { hit: !!run.hit, range: run.range_m, target: run.target_m } : null,
      };
    },
    history: (learnerId) => assignments.attemptsForLearner(learnerId),
  };
};
