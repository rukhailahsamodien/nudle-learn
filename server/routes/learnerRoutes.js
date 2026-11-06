// Learner API ("me" = the logged-in learner). Learners can only touch their own data.
const express = require('express');
const { h } = require('./adminRoutes');

module.exports = ({ auth, requireRole, learningService }) => {
  const r = express.Router();
  r.use(auth, requireRole('learner'));
  const me = (req) => req.user.id;

  r.get('/assignments', h((req, res) => res.json(learningService.list(me(req)))));
  r.get('/assignments/:id', h((req, res) => res.json(learningService.get(req.params.id, me(req)))));
  r.post('/assignments/:id/start', h((req, res) => res.json(learningService.start(req.params.id, me(req)))));
  r.post('/assignments/:id/simulation-runs', h((req, res) => res.status(201).json(learningService.runSimulation(req.params.id, me(req), req.body))));
  r.post('/assignments/:id/submit', h((req, res) => res.json(learningService.submit(req.params.id, me(req), req.body))));
  r.get('/history', h((req, res) => res.json(learningService.history(me(req)))));
  return r;
};
