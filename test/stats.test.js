// Dashboard statistics are checked against an independently built, hand-computable dataset.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startServer } = require('./helpers');
const { hashPassword } = require('../server/utils/password');

let app, admin;
before(async () => {
  app = await startServer({ seedData: false });
  const db = app.db;
  const user = db.prepare('INSERT INTO users (name, email, password_hash, role, active) VALUES (?, ?, ?, ?, ?)');
  user.run('Admin', 'admin@t.io', hashPassword('admin123'), 'admin', 1);
  const l1 = user.run('L1', 'l1@t.io', 'x:y', 'learner', 1).lastInsertRowid;
  const l2 = user.run('L2', 'l2@t.io', 'x:y', 'learner', 1).lastInsertRowid;
  const l3 = user.run('L3', 'l3@t.io', 'x:y', 'learner', 0).lastInsertRowid; // deactivated
  const act = db.prepare("INSERT INTO activities (title, type, subject, content) VALUES (?, 'quiz', ?, '{}')");
  const a1 = act.run('A1', 'Maths').lastInsertRowid;
  const a2 = act.run('A2', 'Science').lastInsertRowid;
  act.run('A3 (unassigned)', 'Art');
  const asg = db.prepare('INSERT INTO assignments (activity_id, learner_id, status, best_score, due_date) VALUES (?, ?, ?, ?, ?)');
  asg.run(a1, l1, 'completed', 80, null);
  asg.run(a2, l1, 'in_progress', null, '2000-01-01'); // overdue
  asg.run(a1, l2, 'completed', 61, null);
  asg.run(a2, l2, 'assigned', null, '2999-01-01');
  asg.run(a1, l3, 'completed', 10, null);              // deactivated learner → excluded
  admin = await app.login('admin@t.io', 'admin123');
});
after(() => app.close());

test('dashboard statistics match hand-calculated values', async () => {
  const { data: s } = await app.call('/api/admin/stats', { token: admin });
  assert.equal(s.totalLearners, 3);
  assert.equal(s.activeLearners, 2);
  assert.equal(s.inactiveLearners, 1);
  assert.equal(s.totalActivities, 3);
  assert.equal(s.assignedActivities, 4);   // active learners only
  assert.equal(s.activitiesInUse, 2);
  assert.equal(s.completed, 2);
  assert.equal(s.inProgress, 1);
  assert.equal(s.notStarted, 1);
  assert.equal(s.overdue, 1);
  assert.equal(s.completionRate, 50);      // 2 / 4
  assert.equal(s.averageScore, 71);        // (80 + 61) / 2 = 70.5 → 71
  assert.deepEqual(s.bySubject.map(r => [r.subject, r.assigned, r.completed, r.completionRate]),
    [['Maths', 2, 2, 100], ['Science', 2, 0, 0]]);
});

test('empty system returns zeros, not errors or NaN', async () => {
  const empty = await startServer({ seedData: false });
  empty.db.prepare("INSERT INTO users (name, email, password_hash, role) VALUES ('A', 'a@t.io', ?, 'admin')").run(hashPassword('admin123'));
  const token = await empty.login('a@t.io', 'admin123');
  const { data: s } = await empty.call('/api/admin/stats', { token });
  assert.equal(s.totalLearners, 0); assert.equal(s.completionRate, 0); assert.equal(s.averageScore, null);
  assert.deepEqual(s.bySubject, []);
  await empty.close();
});
