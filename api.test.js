// API integration tests: run with `npm test` (uses Node's built-in test runner).
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { openDb } = require('../server/db');
const { seed } = require('../server/seed');
const { createApp } = require('../server/app');

let server, base, adminToken, learnerToken;
const call = async (path, { method = 'GET', body, token } = {}) => {
  const res = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const data = res.status === 204 ? null : await res.json();
  return { status: res.status, data };
};
const login = async (email, password) => (await call('/api/auth/login', { method: 'POST', body: { email, password } }));

before(async () => {
  const db = openDb(':memory:'); seed(db);
  server = createApp(db, { secret: 'test' }).listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
  adminToken = (await login('admin@nudle.edu', 'admin123')).data.token;
  learnerToken = (await login('amara@nudle.edu', 'learner123')).data.token;
});
after(() => server.close());

test('rejects bad credentials and unauthenticated requests', async () => {
  assert.equal((await login('admin@nudle.edu', 'nope')).status, 401);
  assert.equal((await call('/api/admin/stats')).status, 401);
});

test('role separation: learner cannot access admin API', async () => {
  assert.equal((await call('/api/learners', { token: learnerToken })).status, 403);
  assert.equal((await call('/api/me/assignments', { token: adminToken })).status, 403);
});

test('dashboard stats', async () => {
  const { data } = await call('/api/admin/stats', { token: adminToken });
  assert.equal(data.totalLearners, 6);
  assert.equal(data.activeLearners, 5);
  assert.ok(data.assignedActivities > 0);
  assert.ok(data.completionRate >= 0 && data.completionRate <= 100);
});

test('learner CRUD, search, filter, deactivate', async () => {
  const created = await call('/api/learners', { method: 'POST', token: adminToken, body: { name: 'Test Person', email: 'test@x.io', password: 'secret1', cohort: 'Grade 12' } });
  assert.equal(created.status, 201);
  assert.equal((await call('/api/learners', { method: 'POST', token: adminToken, body: { name: 'Dup', email: 'TEST@x.io', password: 'secret1' } })).status, 409);
  assert.equal((await call('/api/learners', { method: 'POST', token: adminToken, body: { name: 'X', email: 'bad', password: '1' } })).status, 400);
  const id = created.data.id;
  const upd = await call(`/api/learners/${id}`, { method: 'PUT', token: adminToken, body: { name: 'Tested Person', email: 'test@x.io', cohort: 'Grade 12' } });
  assert.equal(upd.data.name, 'Tested Person');
  assert.equal((await call('/api/learners?q=tested', { token: adminToken })).data.length, 1);
  assert.equal((await call('/api/learners?cohort=Grade%2012', { token: adminToken })).data.length, 1);
  await call(`/api/learners/${id}/status`, { method: 'PATCH', token: adminToken, body: { active: false } });
  assert.equal((await call('/api/learners?status=inactive', { token: adminToken })).data.some(l => l.id === id), true);
  assert.equal((await login('test@x.io', 'secret1')).status, 403);
});

test('create, assign, complete activity with server-side grading', async () => {
  const act = await call('/api/activities', { method: 'POST', token: adminToken, body: {
    title: 'Capitals', type: 'quiz', subject: 'Geography', pass_mark: 50,
    content: { questions: [{ q: 'Capital of France?', options: ['Paris', 'Rome'], answer: 0 }, { q: 'Capital of Italy?', options: ['Paris', 'Rome'], answer: 1 }] } } });
  assert.equal(act.status, 201);
  const me = (await call('/api/auth/me', { token: learnerToken })).data.user;
  const asg = await call(`/api/activities/${act.data.id}/assign`, { method: 'POST', token: adminToken, body: { learnerIds: [me.id], dueDate: '2030-01-01' } });
  assert.equal(asg.data.created, 1);
  const mine = (await call('/api/me/assignments', { token: learnerToken })).data.assignments.find(a => a.activity_id === act.data.id);
  const detail = await call(`/api/me/assignments/${mine.id}`, { token: learnerToken });
  assert.equal(detail.data.content.questions[0].answer, undefined, 'answers must be hidden from learners');
  const fail = await call(`/api/me/assignments/${mine.id}/submit`, { method: 'POST', token: learnerToken, body: { answers: [1, 0] } });
  assert.equal(fail.data.score, 0); assert.equal(fail.data.passed, false);
  const pass = await call(`/api/me/assignments/${mine.id}/submit`, { method: 'POST', token: learnerToken, body: { answers: [0, 1] } });
  assert.equal(pass.data.score, 100); assert.equal(pass.data.passed, true);
  const after = (await call('/api/me/assignments', { token: learnerToken })).data.assignments.find(a => a.id === mine.id);
  assert.equal(after.status, 'completed'); assert.equal(after.attempts, 2);
  assert.equal((await call('/api/me/history', { token: learnerToken })).data.length >= 2, true);
  const stats = (await call(`/api/activities/${act.data.id}`, { token: adminToken })).data.summary;
  assert.equal(stats.completionRate, 100);
});

test('simulation grading uses physics on the server', async () => {
  const { grade } = require('../server/app');
  const content = { targetDistance: 40, tolerance: 2, questions: [] };
  // range = v^2 sin(2θ)/g → v = sqrt(40*9.8) ≈ 19.8 at 45°
  assert.equal(grade(content, 'simulation', [], { angle: 45, speed: 19.8 }).score, 100);
  assert.equal(grade(content, 'simulation', [], { angle: 45, speed: 10 }).score, 0);
});

test('learner cannot access another learner\'s assignment', async () => {
  const liam = (await login('liam@nudle.edu', 'learner123')).data.token;
  const mine = new Set((await call('/api/me/assignments', { token: learnerToken })).data.assignments.map(a => a.id));
  const theirs = (await call('/api/me/assignments', { token: liam })).data.assignments.find(a => !mine.has(a.id));
  assert.equal((await call(`/api/me/assignments/${theirs.id}`, { token: learnerToken })).status, 404);
  assert.equal((await call(`/api/me/assignments/${theirs.id}/submit`, { method: 'POST', token: learnerToken, body: { answers: [] } })).status, 404);
});
