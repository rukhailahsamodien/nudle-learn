// Administrator API. Every route here requires an authenticated admin.
const express = require('express');

// Wraps sync/async handlers so thrown errors reach the error middleware.
const h = (fn) => (req, res, next) => { try { Promise.resolve(fn(req, res)).catch(next); } catch (e) { next(e); } };

module.exports = ({ auth, requireRole, statsService, learnerService, activityService }) => {
  const r = express.Router();
  // Guard only this router's own paths so unknown /api URLs still fall through to a 404.
  r.use(['/admin', '/learners', '/cohorts', '/activities', '/assignments'], auth, requireRole('admin'));

  r.get('/admin/stats', h((req, res) => res.json(statsService.dashboard())));

  r.get('/learners', h((req, res) => res.json(learnerService.list(req.query))));
  r.post('/learners', h((req, res) => res.status(201).json(learnerService.create(req.body))));
  r.get('/learners/:id', h((req, res) => res.json(learnerService.detail(req.params.id))));
  r.put('/learners/:id', h((req, res) => res.json(learnerService.update(req.params.id, req.body))));
  r.patch('/learners/:id/status', h((req, res) => res.json(learnerService.setActive(req.params.id, req.body))));
  r.get('/cohorts', h((req, res) => res.json(learnerService.cohorts())));

  r.get('/activities', h((req, res) => res.json(activityService.list())));
  r.post('/activities', h((req, res) => res.status(201).json(activityService.create(req.body, req.user.id))));
  r.get('/activities/:id', h((req, res) => res.json(activityService.detail(req.params.id))));
  r.put('/activities/:id', h((req, res) => res.json(activityService.update(req.params.id, req.body))));
  r.delete('/activities/:id', h((req, res) => { activityService.remove(req.params.id); res.status(204).end(); }));
  r.post('/activities/:id/assign', h((req, res) => res.json(activityService.assign(req.params.id, req.body))));
  r.delete('/assignments/:id', h((req, res) => { activityService.unassign(req.params.id); res.status(204).end(); }));

  return r;
};

module.exports.h = h;
