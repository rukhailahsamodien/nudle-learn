// Administrator API. Every route here requires an authenticated admin.
const express = require('express');

// Wraps sync/async handlers so thrown errors reach the error middleware.
const h = (fn) => (req, res, next) => { try { Promise.resolve(fn(req, res)).catch(next); } catch (e) { next(e); } };

module.exports = ({ auth, requireRole, statsService, learnerService, activityService, auditService, analyticsService, reportService }) => {
  const record = (req, e) => auditService.record({ actor: req.user, ip: req.ip, ...e });
  const r = express.Router();
  // Guard only this router's own paths so unknown /api URLs still fall through to a 404.
  r.use(['/admin', '/learners', '/cohorts', '/activities', '/assignments', '/reports'], auth, requireRole('admin'));

  r.get('/admin/stats', h((req, res) => res.json(statsService.dashboard())));
  r.get('/admin/analytics', h((req, res) => res.json(analyticsService.overview(req.query))));
  r.get('/admin/audit', h((req, res) => res.json(auditService.search(req.query))));

  r.get('/learners', h((req, res) => res.json(learnerService.list(req.query))));
  r.post('/learners', h((req, res) => {
    const l = learnerService.create(req.body);
    record(req, { action: 'learner.create', entity: 'learner', entityId: l.id, summary: `Added learner ${l.name}`, details: { email: l.email, cohort: l.cohort } });
    res.status(201).json(l);
  }));
  r.get('/learners/:id', h((req, res) => res.json({ ...learnerService.detail(req.params.id), activityLog: auditService.forLearner(+req.params.id) })));
  r.put('/learners/:id', h((req, res) => {
    const l = learnerService.update(req.params.id, req.body);
    record(req, { action: 'learner.update', entity: 'learner', entityId: l.id, summary: `Updated learner ${l.name}`,
      details: { email: l.email, cohort: l.cohort, passwordChanged: !!req.body?.password } });
    res.json(l);
  }));
  r.patch('/learners/:id/status', h((req, res) => {
    const l = learnerService.setActive(req.params.id, req.body);
    record(req, { action: l.active ? 'learner.reactivate' : 'learner.deactivate', entity: 'learner', entityId: l.id, summary: `${l.active ? 'Reactivated' : 'Deactivated'} ${l.name}` });
    res.json(l);
  }));
  r.get('/cohorts', h((req, res) => res.json(learnerService.cohorts())));

  r.get('/activities', h((req, res) => res.json(activityService.list())));
  r.post('/activities', h((req, res) => {
    const a = activityService.create(req.body, req.user.id);
    record(req, { action: 'activity.create', entity: 'activity', entityId: a.id, summary: `Created ${a.type} "${a.title}"` });
    res.status(201).json(a);
  }));
  r.get('/activities/:id', h((req, res) => res.json(activityService.detail(req.params.id))));
  r.put('/activities/:id', h((req, res) => {
    const a = activityService.update(req.params.id, req.body);
    record(req, { action: 'activity.update', entity: 'activity', entityId: a.id, summary: `Updated ${a.type} "${a.title}"` });
    res.json(a);
  }));
  r.delete('/activities/:id', h((req, res) => {
    const before = activityService.detail(req.params.id).activity;
    activityService.remove(req.params.id);
    record(req, { action: 'activity.delete', entity: 'activity', entityId: before.id, summary: `Deleted ${before.type} "${before.title}"` });
    res.status(204).end();
  }));
  r.post('/activities/:id/assign', h((req, res) => {
    const result = activityService.assign(req.params.id, req.body);
    const a = activityService.detail(req.params.id).activity;
    record(req, { action: 'assignment.create', entity: 'activity', entityId: a.id,
      summary: `Assigned "${a.title}" to ${result.created} learner${result.created === 1 ? '' : 's'}${req.body?.cohort ? ` (cohort ${req.body.cohort})` : ''}`,
      details: { ...result, cohort: req.body?.cohort || null, dueDate: req.body?.dueDate || null } });
    res.json(result);
  }));
  r.delete('/assignments/:id', h((req, res) => {
    activityService.unassign(req.params.id);
    record(req, { action: 'assignment.delete', entity: 'assignment', entityId: +req.params.id, summary: `Removed assignment #${req.params.id}` });
    res.status(204).end();
  }));

  // Exportable reports (CSV). Content-Disposition makes the browser download a file.
  const sendCsv = (res, { filename, csv }) => res.set({ 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${filename}"` }).send(csv);
  r.get('/reports/learners.csv', h((req, res) => {
    const out = reportService.allLearnersCsv();
    record(req, { action: 'report.export', entity: 'report', summary: `Exported performance report (${out.count} learners)`, live: false });
    sendCsv(res, out);
  }));
  r.get('/reports/learners/:id.csv', h((req, res) => {
    const out = reportService.learnerCsv(req.params.id);
    record(req, { action: 'report.export', entity: 'learner', entityId: out.learner.id, summary: `Exported report for ${out.learner.name}`, live: false });
    sendCsv(res, out);
  }));

  return r;
};

module.exports.h = h;
