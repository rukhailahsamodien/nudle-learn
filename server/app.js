// Express application: REST API + static front end.
const express = require('express');
const path = require('path');
const crypto = require('crypto');
const { hashPassword, verifyPassword } = require('./db');

const TOKEN_TTL_MS = 1000 * 60 * 60 * 12; // 12 hours
const GRAVITY = 9.8;

function createApp(db, { secret = process.env.APP_SECRET || crypto.randomBytes(32).toString('hex') } = {}) {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  // ---------- helpers ----------
  const sign = (data) => crypto.createHmac('sha256', secret).update(data).digest('base64url');
  const makeToken = (user) => {
    const payload = Buffer.from(JSON.stringify({ id: user.id, role: user.role, exp: Date.now() + TOKEN_TTL_MS })).toString('base64url');
    return `${payload}.${sign(payload)}`;
  };
  const readToken = (token) => {
    const [payload, sig] = String(token || '').split('.');
    if (!payload || !sig) return null;
    const expected = sign(payload);
    if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    try {
      const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
      return data.exp > Date.now() ? data : null;
    } catch { return null; }
  };
  const publicUser = (u) => u && ({ id: u.id, name: u.name, email: u.email, role: u.role, cohort: u.cohort, active: !!u.active, created_at: u.created_at, last_login: u.last_login });
  const fail = (res, status, error) => res.status(status).json({ error });
  const parseActivity = (a, { hideAnswers = false } = {}) => {
    if (!a) return a;
    const content = JSON.parse(a.content);
    if (hideAnswers && content.questions) content.questions = content.questions.map(({ answer, ...rest }) => rest);
    return { ...a, content };
  };
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // ---------- auth middleware ----------
  const auth = (role) => (req, res, next) => {
    const header = req.headers.authorization || '';
    const data = readToken(header.startsWith('Bearer ') ? header.slice(7) : null);
    if (!data) return fail(res, 401, 'Not authenticated');
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(data.id);
    if (!user || !user.active) return fail(res, 401, 'Account inactive or not found');
    if (role && user.role !== role) return fail(res, 403, 'Forbidden');
    req.user = user;
    next();
  };
  const admin = auth('admin');
  const learner = auth('learner');

  // ---------- auth routes ----------
  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) return fail(res, 400, 'Email and password are required');
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(String(email).trim());
    if (!user || !verifyPassword(String(password), user.password_hash)) return fail(res, 401, 'Invalid email or password');
    if (!user.active) return fail(res, 403, 'This account has been deactivated. Contact your administrator.');
    db.prepare("UPDATE users SET last_login = datetime('now') WHERE id = ?").run(user.id);
    res.json({ token: makeToken(user), user: publicUser(user) });
  });
  app.get('/api/auth/me', auth(), (req, res) => res.json({ user: publicUser(req.user) }));

  // ---------- admin: dashboard ----------
  app.get('/api/admin/stats', admin, (req, res) => {
    const learners = db.prepare("SELECT COUNT(*) total, SUM(active) active FROM users WHERE role='learner'").get();
    const asg = db.prepare(`SELECT COUNT(*) total,
        SUM(status='completed') completed, SUM(status='in_progress') in_progress, SUM(status='assigned') not_started,
        ROUND(AVG(CASE WHEN status='completed' THEN best_score END)) avg_score,
        SUM(status!='completed' AND due_date < date('now')) overdue
      FROM assignments`).get();
    const activities = db.prepare('SELECT COUNT(*) c FROM activities').get().c;
    const bySubject = db.prepare(`SELECT COALESCE(a.subject,'General') subject, COUNT(s.id) assigned, SUM(s.status='completed') completed
      FROM activities a LEFT JOIN assignments s ON s.activity_id=a.id GROUP BY 1 ORDER BY 1`).all();
    const recent = db.prepare(`SELECT s.completed_at, s.best_score score, u.name learner, a.title activity
      FROM assignments s JOIN users u ON u.id=s.learner_id JOIN activities a ON a.id=s.activity_id
      WHERE s.status='completed' ORDER BY s.completed_at DESC LIMIT 6`).all();
    res.json({
      totalLearners: learners.total || 0,
      activeLearners: learners.active || 0,
      totalActivities: activities,
      assignedActivities: asg.total || 0,
      completed: asg.completed || 0,
      inProgress: asg.in_progress || 0,
      notStarted: asg.not_started || 0,
      overdue: asg.overdue || 0,
      completionRate: asg.total ? Math.round((asg.completed / asg.total) * 100) : 0,
      averageScore: asg.avg_score ?? null,
      bySubject, recent,
    });
  });

  // ---------- admin: learners ----------
  app.get('/api/learners', admin, (req, res) => {
    const { q = '', status = 'all', cohort = '' } = req.query;
    const where = ["u.role='learner'"]; const params = [];
    if (q) { where.push('(u.name LIKE ? OR u.email LIKE ?)'); params.push(`%${q}%`, `%${q}%`); }
    if (status === 'active') where.push('u.active=1');
    if (status === 'inactive') where.push('u.active=0');
    if (cohort) { where.push('u.cohort = ?'); params.push(cohort); }
    const rows = db.prepare(`SELECT u.*, COUNT(s.id) assigned, COALESCE(SUM(s.status='completed'),0) completed,
        ROUND(AVG(CASE WHEN s.status='completed' THEN s.best_score END)) avg_score
      FROM users u LEFT JOIN assignments s ON s.learner_id=u.id
      WHERE ${where.join(' AND ')} GROUP BY u.id ORDER BY u.name`).all(...params);
    res.json(rows.map(r => ({ ...publicUser(r), assigned: r.assigned, completed: r.completed, avgScore: r.avg_score,
      progress: r.assigned ? Math.round((r.completed / r.assigned) * 100) : 0 })));
  });

  app.get('/api/cohorts', admin, (req, res) => {
    res.json(db.prepare("SELECT DISTINCT cohort FROM users WHERE role='learner' AND cohort IS NOT NULL AND cohort!='' ORDER BY cohort").all().map(r => r.cohort));
  });

  const validateLearner = (body, { requirePassword }) => {
    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const cohort = String(body.cohort || '').trim() || null;
    const password = body.password ? String(body.password) : '';
    if (name.length < 2) return { error: 'Name must be at least 2 characters' };
    if (!EMAIL_RE.test(email)) return { error: 'A valid email is required' };
    if (requirePassword && password.length < 6) return { error: 'Password must be at least 6 characters' };
    if (!requirePassword && password && password.length < 6) return { error: 'Password must be at least 6 characters' };
    return { name, email, cohort, password };
  };

  app.post('/api/learners', admin, (req, res) => {
    const v = validateLearner(req.body || {}, { requirePassword: true });
    if (v.error) return fail(res, 400, v.error);
    if (db.prepare('SELECT 1 FROM users WHERE email=?').get(v.email)) return fail(res, 409, 'A user with this email already exists');
    const id = db.prepare("INSERT INTO users (name,email,password_hash,role,cohort) VALUES (?,?,?,'learner',?)")
      .run(v.name, v.email, hashPassword(v.password), v.cohort).lastInsertRowid;
    res.status(201).json(publicUser(db.prepare('SELECT * FROM users WHERE id=?').get(id)));
  });

  const getLearner = (id) => db.prepare("SELECT * FROM users WHERE id=? AND role='learner'").get(Number(id));

  app.put('/api/learners/:id', admin, (req, res) => {
    const existing = getLearner(req.params.id);
    if (!existing) return fail(res, 404, 'Learner not found');
    const v = validateLearner(req.body || {}, { requirePassword: false });
    if (v.error) return fail(res, 400, v.error);
    if (db.prepare('SELECT 1 FROM users WHERE email=? AND id!=?').get(v.email, existing.id)) return fail(res, 409, 'A user with this email already exists');
    db.prepare('UPDATE users SET name=?, email=?, cohort=? WHERE id=?').run(v.name, v.email, v.cohort, existing.id);
    if (v.password) db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(hashPassword(v.password), existing.id);
    res.json(publicUser(getLearner(existing.id)));
  });

  app.patch('/api/learners/:id/status', admin, (req, res) => {
    const existing = getLearner(req.params.id);
    if (!existing) return fail(res, 404, 'Learner not found');
    const active = req.body && req.body.active ? 1 : 0;
    db.prepare('UPDATE users SET active=? WHERE id=?').run(active, existing.id);
    res.json(publicUser(getLearner(existing.id)));
  });

  app.get('/api/learners/:id', admin, (req, res) => {
    const l = getLearner(req.params.id);
    if (!l) return fail(res, 404, 'Learner not found');
    const assignments = db.prepare(`SELECT s.*, a.title, a.type, a.subject, a.pass_mark FROM assignments s
      JOIN activities a ON a.id=s.activity_id WHERE s.learner_id=? ORDER BY s.assigned_at DESC`).all(l.id);
    const attempts = db.prepare(`SELECT t.score, t.passed, t.submitted_at, a.title FROM attempts t
      JOIN assignments s ON s.id=t.assignment_id JOIN activities a ON a.id=s.activity_id
      WHERE s.learner_id=? ORDER BY t.submitted_at DESC`).all(l.id);
    res.json({ learner: publicUser(l), assignments, attempts, summary: summarize(assignments) });
  });

  // ---------- admin: activities ----------
  const validateActivity = (b) => {
    const title = String(b.title || '').trim();
    const type = b.type;
    if (title.length < 3) return { error: 'Title must be at least 3 characters' };
    if (!['lesson', 'quiz', 'simulation'].includes(type)) return { error: 'Type must be lesson, quiz or simulation' };
    const content = b.content && typeof b.content === 'object' ? b.content : {};
    const questions = Array.isArray(content.questions) ? content.questions : [];
    for (const [i, q] of questions.entries()) {
      if (!q || !String(q.q || '').trim()) return { error: `Question ${i + 1} needs text` };
      if (!Array.isArray(q.options) || q.options.filter(o => String(o).trim()).length < 2) return { error: `Question ${i + 1} needs at least 2 options` };
      if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= q.options.length) return { error: `Question ${i + 1} needs a valid correct answer` };
    }
    if (type === 'quiz' && questions.length === 0) return { error: 'A quiz needs at least one question' };
    if (type === 'lesson' && !(Array.isArray(content.sections) && content.sections.length)) return { error: 'A lesson needs at least one content section' };
    if (type === 'simulation') {
      content.simulation = 'projectile';
      content.targetDistance = Number(content.targetDistance) || 40;
      content.tolerance = Number(content.tolerance) || 2;
    }
    const pass = Math.min(100, Math.max(0, parseInt(b.pass_mark ?? 50, 10) || 0));
    const dur = Math.max(1, parseInt(b.duration_min ?? 10, 10) || 10);
    return { title, type, description: String(b.description || '').trim(), subject: String(b.subject || '').trim() || 'General', duration_min: dur, pass_mark: pass, content };
  };

  app.get('/api/activities', admin, (req, res) => {
    const rows = db.prepare(`SELECT a.*, COUNT(s.id) assigned, COALESCE(SUM(s.status='completed'),0) completed,
        COALESCE(SUM(s.status='in_progress'),0) in_progress,
        ROUND(AVG(CASE WHEN s.status='completed' THEN s.best_score END)) avg_score
      FROM activities a LEFT JOIN assignments s ON s.activity_id=a.id GROUP BY a.id ORDER BY a.created_at DESC, a.id DESC`).all();
    res.json(rows.map(r => ({ ...parseActivity(r), completionRate: r.assigned ? Math.round((r.completed / r.assigned) * 100) : 0 })));
  });

  app.get('/api/activities/:id', admin, (req, res) => {
    const a = db.prepare('SELECT * FROM activities WHERE id=?').get(Number(req.params.id));
    if (!a) return fail(res, 404, 'Activity not found');
    const assignees = db.prepare(`SELECT s.*, u.name, u.email, u.cohort FROM assignments s JOIN users u ON u.id=s.learner_id
      WHERE s.activity_id=? ORDER BY u.name`).all(a.id);
    res.json({ activity: parseActivity(a), assignees, summary: summarize(assignees) });
  });

  app.post('/api/activities', admin, (req, res) => {
    const v = validateActivity(req.body || {});
    if (v.error) return fail(res, 400, v.error);
    const id = db.prepare('INSERT INTO activities (title,description,type,subject,duration_min,pass_mark,content,created_by) VALUES (?,?,?,?,?,?,?,?)')
      .run(v.title, v.description, v.type, v.subject, v.duration_min, v.pass_mark, JSON.stringify(v.content), req.user.id).lastInsertRowid;
    res.status(201).json(parseActivity(db.prepare('SELECT * FROM activities WHERE id=?').get(id)));
  });

  app.put('/api/activities/:id', admin, (req, res) => {
    const a = db.prepare('SELECT * FROM activities WHERE id=?').get(Number(req.params.id));
    if (!a) return fail(res, 404, 'Activity not found');
    const v = validateActivity(req.body || {});
    if (v.error) return fail(res, 400, v.error);
    db.prepare('UPDATE activities SET title=?,description=?,type=?,subject=?,duration_min=?,pass_mark=?,content=? WHERE id=?')
      .run(v.title, v.description, v.type, v.subject, v.duration_min, v.pass_mark, JSON.stringify(v.content), a.id);
    res.json(parseActivity(db.prepare('SELECT * FROM activities WHERE id=?').get(a.id)));
  });

  app.delete('/api/activities/:id', admin, (req, res) => {
    const r = db.prepare('DELETE FROM activities WHERE id=?').run(Number(req.params.id));
    if (!r.changes) return fail(res, 404, 'Activity not found');
    res.status(204).end();
  });

  app.post('/api/activities/:id/assign', admin, (req, res) => {
    const a = db.prepare('SELECT * FROM activities WHERE id=?').get(Number(req.params.id));
    if (!a) return fail(res, 404, 'Activity not found');
    const { learnerIds = [], cohort, dueDate } = req.body || {};
    if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) return fail(res, 400, 'Due date must be YYYY-MM-DD');
    let ids = Array.isArray(learnerIds) ? learnerIds.map(Number).filter(Boolean) : [];
    if (cohort) ids = ids.concat(db.prepare("SELECT id FROM users WHERE role='learner' AND active=1 AND cohort=?").all(cohort).map(r => r.id));
    ids = [...new Set(ids)];
    if (!ids.length) return fail(res, 400, 'Select at least one learner or cohort');
    const valid = new Set(db.prepare(`SELECT id FROM users WHERE role='learner' AND id IN (${ids.map(() => '?').join(',')})`).all(...ids).map(r => r.id));
    const ins = db.prepare('INSERT OR IGNORE INTO assignments (activity_id, learner_id, due_date) VALUES (?,?,?)');
    let created = 0;
    for (const id of ids) if (valid.has(id)) created += ins.run(a.id, id, dueDate || null).changes;
    res.json({ created, skipped: ids.length - created });
  });

  app.delete('/api/assignments/:id', admin, (req, res) => {
    const r = db.prepare('DELETE FROM assignments WHERE id=?').run(Number(req.params.id));
    if (!r.changes) return fail(res, 404, 'Assignment not found');
    res.status(204).end();
  });

  // ---------- learner ----------
  const myAssignment = (req) => db.prepare(`SELECT s.*, a.title, a.description, a.type, a.subject, a.duration_min, a.pass_mark, a.content
    FROM assignments s JOIN activities a ON a.id=s.activity_id WHERE s.id=? AND s.learner_id=?`).get(Number(req.params.id), req.user.id);

  app.get('/api/me/assignments', learner, (req, res) => {
    const rows = db.prepare(`SELECT s.*, a.title, a.description, a.type, a.subject, a.duration_min, a.pass_mark
      FROM assignments s JOIN activities a ON a.id=s.activity_id WHERE s.learner_id=?
      ORDER BY CASE s.status WHEN 'in_progress' THEN 0 WHEN 'assigned' THEN 1 ELSE 2 END, s.due_date IS NULL, s.due_date`).all(req.user.id);
    res.json({ assignments: rows, summary: summarize(rows) });
  });

  app.get('/api/me/assignments/:id', learner, (req, res) => {
    const s = myAssignment(req);
    if (!s) return fail(res, 404, 'Assignment not found');
    res.json(parseActivity(s, { hideAnswers: true }));
  });

  app.post('/api/me/assignments/:id/start', learner, (req, res) => {
    const s = myAssignment(req);
    if (!s) return fail(res, 404, 'Assignment not found');
    if (s.status === 'assigned') db.prepare("UPDATE assignments SET status='in_progress', started_at=datetime('now') WHERE id=?").run(s.id);
    res.json({ ok: true });
  });

  app.post('/api/me/assignments/:id/submit', learner, (req, res) => {
    const s = myAssignment(req);
    if (!s) return fail(res, 404, 'Assignment not found');
    const content = JSON.parse(s.content);
    const { answers = [], simulation } = req.body || {};
    const result = grade(content, s.type, answers, simulation);
    const passed = result.score >= s.pass_mark;
    db.prepare('INSERT INTO attempts (assignment_id, score, passed, answers) VALUES (?,?,?,?)')
      .run(s.id, result.score, passed ? 1 : 0, JSON.stringify({ answers, simulation }));
    const best = Math.max(result.score, s.best_score ?? 0);
    if (passed) {
      db.prepare(`UPDATE assignments SET status='completed', score=?, best_score=?, attempts=attempts+1,
        started_at=COALESCE(started_at, datetime('now')), completed_at=COALESCE(completed_at, datetime('now')) WHERE id=?`).run(result.score, best, s.id);
    } else {
      db.prepare(`UPDATE assignments SET status=CASE WHEN status='completed' THEN 'completed' ELSE 'in_progress' END,
        score=?, best_score=?, attempts=attempts+1, started_at=COALESCE(started_at, datetime('now')) WHERE id=?`).run(result.score, best, s.id);
    }
    res.json({ ...result, passed, passMark: s.pass_mark });
  });

  app.get('/api/me/history', learner, (req, res) => {
    res.json(db.prepare(`SELECT t.id, t.score, t.passed, t.submitted_at, a.title, a.type, a.subject FROM attempts t
      JOIN assignments s ON s.id=t.assignment_id JOIN activities a ON a.id=s.activity_id
      WHERE s.learner_id=? ORDER BY t.submitted_at DESC, t.id DESC`).all(req.user.id));
  });

  // ---------- static front end ----------
  app.use('/api', (req, res) => fail(res, 404, 'Not found'));
  app.use(express.static(path.join(__dirname, '..', 'public')));
  app.get('*', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'index.html')));

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') return fail(res, 400, 'Invalid JSON body');
    console.error(err);
    fail(res, 500, 'Internal server error');
  });

  return app;
}

function summarize(rows) {
  const total = rows.length;
  const completed = rows.filter(r => r.status === 'completed').length;
  const inProgress = rows.filter(r => r.status === 'in_progress').length;
  const scores = rows.filter(r => r.status === 'completed' && r.best_score != null).map(r => r.best_score);
  return {
    total, completed, inProgress, notStarted: total - completed - inProgress,
    completionRate: total ? Math.round((completed / total) * 100) : 0,
    averageScore: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
  };
}

// Server-side grading so learners cannot tamper with scores.
function grade(content, type, answers, simulation) {
  const questions = content.questions || [];
  const feedback = questions.map((q, i) => ({ correct: Number(answers[i]) === q.answer, correctAnswer: q.answer }));
  const correct = feedback.filter(f => f.correct).length;
  const parts = [];
  if (questions.length) parts.push(correct / questions.length);
  let sim = null;
  if (type === 'simulation') {
    const angle = Number(simulation && simulation.angle);
    const speed = Number(simulation && simulation.speed);
    let hit = false; let range = null;
    if (angle > 0 && angle < 90 && speed > 0 && speed <= 100) {
      range = (speed * speed * Math.sin((2 * angle * Math.PI) / 180)) / GRAVITY;
      hit = Math.abs(range - content.targetDistance) <= content.tolerance;
    }
    sim = { hit, range: range == null ? null : Math.round(range * 10) / 10 };
    parts.unshift(hit ? 1 : 0);
  }
  if (type === 'lesson' && !questions.length) parts.push(1); // reading-only lesson
  const score = parts.length ? Math.round((parts.reduce((a, b) => a + b, 0) / parts.length) * 100) : 100;
  return { score, correct, total: questions.length, feedback, simulation: sim };
}

module.exports = { createApp, grade };
