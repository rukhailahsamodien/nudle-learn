// Learner API ("me" = the logged-in learner). Learners can only touch their own data.
const express = require('express');
const { h } = require('./adminRoutes');

module.exports = ({ auth, requireRole, learningService, auditService, idem }) => {
  const r = express.Router();
  r.use(auth, requireRole('learner'));
  const me = (req) => req.user.id;
  const record = (req, e) => auditService.record({ actor: req.user, ip: req.ip, ...e });

  r.get('/assignments', h((req, res) => res.json(learningService.list(me(req)))));
  r.get('/assignments/:id', h((req, res) => res.json(learningService.get(req.params.id, me(req)))));
  r.post('/assignments/:id/start', h((req, res) => res.json(learningService.start(req.params.id, me(req)))));
  r.post('/assignments/:id/simulation-runs', idem, h((req, res) => {
    const run = learningService.runSimulation(req.params.id, me(req), req.body);
    record(req, { action: 'simulation.launch', entity: 'assignment', entityId: +req.params.id,
      summary: `${req.user.name} launched at ${run.angle}° / ${run.speed} m/s — ${run.hit ? 'hit' : 'miss'} (${run.range} m)`, details: run });
    res.status(201).json(run);
  }));
  r.post('/assignments/:id/submit', idem, h((req, res) => {
    const result = learningService.submit(req.params.id, me(req), req.body);
    record(req, { action: result.passed ? 'attempt.pass' : 'attempt.fail', entity: 'assignment', entityId: +req.params.id,
      summary: `${req.user.name} ${result.passed ? 'completed' : 'attempted'} "${result.title}" — ${result.score}%`, details: { score: result.score, passed: result.passed } });
    res.json(result);
  }));
  r.put('/assignments/:id/progress', h((req, res) => res.json(learningService.saveProgress(req.params.id, me(req), req.body))));
  r.delete('/assignments/:id/progress', h((req, res) => res.json(learningService.clearProgress(req.params.id, me(req)))));
  r.get('/history', h((req, res) => res.json(learningService.history(me(req)))));
  return r;
};
