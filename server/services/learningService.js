// Learner-facing operations: view assignments, run simulations, submit attempts.
const v = require('../utils/validate');
const { badRequest, notFound, conflict } = require('../utils/errors');
const { transaction } = require('../db/connection');
const { toActivity, summarize } = require('./mappers');
const { evaluateLaunch, gradeSubmission } = require('./grading');

module.exports = ({ db, assignments, progress, gravity }) => {
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
      if (s.type === 'simulation') {
        out.simulationRuns = assignments.simulationRunsForAssignment(s.id).slice(0, 10);
        out.launchesUsed = assignments.countSimulationRuns(s.id);
      }
      out.progress = progress.get(s.id);
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
      const content = toActivity(s).content;
      // Launch limits come from the activity's scenario (older activities fall back to the defaults).
      const angle = v.number(body.angle, 'Angle', { min: content.angleMin ?? 1, max: content.angleMax ?? 89 });
      const speed = v.number(body.speed, 'Speed', { min: content.speedMin ?? 1, max: content.speedMax ?? 100 });
      if (content.maxLaunches && assignments.countSimulationRuns(s.id) >= content.maxLaunches) {
        throw conflict(`You have used all ${content.maxLaunches} launches for this activity`);
      }
      const result = evaluateLaunch({ angle, speed }, content, content.gravity ?? gravity);
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
        if (passed) progress.clear(s.id);
      });
      return {
        ...result, passed, passMark: s.pass_mark, title: s.title,
        simulation: run ? { hit: !!run.hit, range: run.range_m, target: run.target_m } : null,
      };
    },
    history: (learnerId) => assignments.attemptsForLearner(learnerId),

    // Autosaved work-in-progress so a learner can close the tab and resume later.
    saveProgress(id, learnerId, body = {}) {
      const s = getOwnOr404(id, learnerId);
      v.object(body, 'Progress');
      const content = toActivity(s).content;
      const qCount = (content.questions || []).length;
      const state = {};
      if (body.angle != null) state.angle = v.number(body.angle, 'Angle', { min: 1, max: 89 });
      if (body.speed != null) state.speed = v.number(body.speed, 'Speed', { min: 1, max: 100 });
      if (body.answers != null) {
        if (!Array.isArray(body.answers) || body.answers.length > qCount) throw badRequest('Answers must be a list matching the questions');
        state.answers = body.answers.map((a, i) => a == null ? null : v.int(a, `Answer ${i + 1}`, { min: 0, max: content.questions[i].options.length - 1 }));
      }
      if (body.section != null) state.section = v.int(body.section, 'Section', { min: 0, max: 100 });
      progress.save(s.id, state);
      if (s.status === 'assigned') assignments.markStarted(s.id);
      return { saved: true, state, savedAt: progress.get(s.id).savedAt };
    },
    clearProgress(id, learnerId) {
      const s = getOwnOr404(id, learnerId);
      progress.clear(s.id);
      return { cleared: true };
    },
  };
};
