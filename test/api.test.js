// Integration tests against the real HTTP API with an in-memory database.
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const { startServer } = require('./helpers');

let app, admin, amara;
before(async () => {
  app = await startServer();
  admin = await app.login('admin@nudle.edu', 'admin123');
  amara = await app.login('amara@nudle.edu', 'learner123');
});
after(() => app.close());

describe('authentication & access control', () => {
  test('rejects bad credentials without revealing which part was wrong', async () => {
    const a = await app.call('/api/auth/login', { method: 'POST', body: { email: 'admin@nudle.edu', password: 'nope' } });
    const b = await app.call('/api/auth/login', { method: 'POST', body: { email: 'ghost@nudle.edu', password: 'nope' } });
    assert.equal(a.status, 401); assert.equal(b.status, 401);
    assert.equal(a.data.error, b.data.error);
  });
  test('responses never include password hashes', async () => {
    const r = await app.call('/api/auth/me', { token: admin });
    assert.equal(r.data.user.password_hash, undefined);
    const list = await app.call('/api/learners', { token: admin });
    assert.ok(list.data.every(l => l.password_hash === undefined));
  });
  test('missing, malformed and forged tokens are rejected', async () => {
    assert.equal((await app.call('/api/admin/stats')).status, 401);
    assert.equal((await app.call('/api/admin/stats', { token: 'garbage' })).status, 401);
    const [payload] = amara.split('.');
    const forged = Buffer.from(JSON.stringify({ sub: 1, role: 'admin', exp: Date.now() + 1e6 })).toString('base64url');
    assert.equal((await app.call('/api/admin/stats', { token: `${forged}.${amara.split('.')[1]}` })).status, 401);
    assert.ok(payload);
  });
  test('role separation', async () => {
    assert.equal((await app.call('/api/learners', { token: amara })).status, 403);
    assert.equal((await app.call('/api/admin/stats', { token: amara })).status, 403);
    assert.equal((await app.call('/api/me/assignments', { token: admin })).status, 403);
  });
  test('unknown endpoints return 404 JSON', async () => {
    const r = await app.call('/api/does-not-exist');
    assert.equal(r.status, 404); assert.equal(r.data.code, 'NOT_FOUND');
  });
  test('security headers are set', async () => {
    const r = await app.call('/api/health');
    assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(r.headers.get('x-powered-by'), null);
  });
  test('failed logins are rate limited', async () => {
    const limited = await startServer({ loginRateLimit: { windowMs: 60000, max: 3 } });
    for (let i = 0; i < 3; i++) await limited.call('/api/auth/login', { method: 'POST', body: { email: 'admin@nudle.edu', password: 'x' } });
    const r = await limited.call('/api/auth/login', { method: 'POST', body: { email: 'admin@nudle.edu', password: 'admin123' } });
    assert.equal(r.status, 429); assert.ok(r.headers.get('retry-after'));
    await limited.close();
  });
});

describe('validation & error handling', () => {
  test('malformed JSON → 400', async () => {
    const r = await app.call('/api/learners', { method: 'POST', token: admin, raw: '{bad json' });
    assert.equal(r.status, 400); assert.equal(r.data.code, 'INVALID_JSON');
  });
  test('invalid ids → 400, missing records → 404', async () => {
    assert.equal((await app.call('/api/learners/abc', { token: admin })).status, 400);
    assert.equal((await app.call('/api/learners/99999', { token: admin })).status, 404);
    assert.equal((await app.call('/api/activities/99999', { method: 'DELETE', token: admin })).status, 404);
  });
  test('learner fields are validated', async () => {
    const bad = [
      { name: 'A', email: 'a@b.io', password: 'secret1' },
      { name: 'Valid', email: 'bad', password: 'secret1' },
      { name: 'Valid', email: 'a@b.io', password: '123' },
      { name: 'Valid', email: 'a@b.io', password: 'secret1', cohort: 'x'.repeat(60) },
    ];
    for (const body of bad) assert.equal((await app.call('/api/learners', { method: 'POST', token: admin, body })).status, 400, JSON.stringify(body));
    assert.equal((await app.call('/api/learners/2/status', { method: 'PATCH', token: admin, body: { active: 'yes' } })).status, 400);
  });
  test('activity fields are validated', async () => {
    const bad = [
      { title: 'Quiz', type: 'quiz', content: { questions: [] } },
      { title: 'Quiz', type: 'video', content: {} },
      { title: 'Quiz', type: 'quiz', content: { questions: [{ q: 'Q?', options: ['a'], answer: 0 }] } },
      { title: 'Quiz', type: 'quiz', content: { questions: [{ q: 'Q?', options: ['a', 'b'], answer: 5 }] } },
      { title: 'Quiz', type: 'quiz', pass_mark: 150, content: { questions: [{ q: 'Q?', options: ['a', 'b'], answer: 0 }] } },
      { title: 'Lesson', type: 'lesson', content: { sections: [] } },
      { title: 'Sim', type: 'simulation', content: { targetDistance: 9999 } },
    ];
    for (const body of bad) assert.equal((await app.call('/api/activities', { method: 'POST', token: admin, body })).status, 400, JSON.stringify(body));
  });
  test('assign validates due date and learner ids', async () => {
    assert.equal((await app.call('/api/activities/1/assign', { method: 'POST', token: admin, body: { learnerIds: [2], dueDate: 'tomorrow' } })).status, 400);
    assert.equal((await app.call('/api/activities/1/assign', { method: 'POST', token: admin, body: { learnerIds: [1] } })).status, 400, 'admin is not a learner');
    assert.equal((await app.call('/api/activities/1/assign', { method: 'POST', token: admin, body: {} })).status, 400);
  });
  test('search treats % and _ literally', async () => {
    assert.equal((await app.call('/api/learners?q=%25', { token: admin })).data.length, 0);
  });
});

describe('learner management', () => {
  test('create, update, search, filter, deactivate', async () => {
    const created = await app.call('/api/learners', { method: 'POST', token: admin, body: { name: 'Test Person', email: 'test@x.io', password: 'secret1', cohort: 'Grade 12' } });
    assert.equal(created.status, 201);
    assert.equal((await app.call('/api/learners', { method: 'POST', token: admin, body: { name: 'Dup', email: 'TEST@x.io', password: 'secret1' } })).status, 409);
    const id = created.data.id;
    const upd = await app.call(`/api/learners/${id}`, { method: 'PUT', token: admin, body: { name: 'Tested Person', email: 'test@x.io', cohort: 'Grade 12' } });
    assert.equal(upd.data.name, 'Tested Person');
    assert.equal((await app.call('/api/learners?q=tested', { token: admin })).data.length, 1);
    assert.equal((await app.call('/api/learners?cohort=Grade%2012', { token: admin })).data.length, 1);
    const token = await app.login('test@x.io', 'secret1');
    await app.call(`/api/learners/${id}/status`, { method: 'PATCH', token: admin, body: { active: false } });
    assert.ok((await app.call('/api/learners?status=inactive', { token: admin })).data.some(l => l.id === id));
    assert.equal((await app.call('/api/auth/login', { method: 'POST', body: { email: 'test@x.io', password: 'secret1' } })).status, 403);
    assert.equal((await app.call('/api/me/assignments', { token })).status, 401, 'existing session is revoked on deactivation');
  });
});

describe('activities, simulation results and grading', () => {
  test('quiz: answers hidden, graded on server, attempts stored', async () => {
    const act = await app.call('/api/activities', { method: 'POST', token: admin, body: {
      title: 'Capitals', type: 'quiz', subject: 'Geography', pass_mark: 50,
      content: { questions: [{ q: 'Capital of France?', options: ['Paris', 'Rome'], answer: 0 }, { q: 'Capital of Italy?', options: ['Paris', 'Rome'], answer: 1 }] } } });
    assert.equal(act.status, 201);
    const me = (await app.call('/api/auth/me', { token: amara })).data.user;
    assert.equal((await app.call(`/api/activities/${act.data.id}/assign`, { method: 'POST', token: admin, body: { learnerIds: [me.id], dueDate: '2030-01-01' } })).data.created, 1);
    assert.equal((await app.call(`/api/activities/${act.data.id}/assign`, { method: 'POST', token: admin, body: { learnerIds: [me.id] } })).data.skipped, 1);
    const mine = (await app.call('/api/me/assignments', { token: amara })).data.assignments.find(a => a.activity_id === act.data.id);
    const detail = await app.call(`/api/me/assignments/${mine.id}`, { token: amara });
    assert.equal(detail.data.content.questions[0].answer, undefined, 'answer key must not reach the learner');
    assert.equal((await app.call(`/api/me/assignments/${mine.id}/submit`, { method: 'POST', token: amara, body: { answers: [0] } })).status, 400, 'must answer all');
    assert.equal((await app.call(`/api/me/assignments/${mine.id}/submit`, { method: 'POST', token: amara, body: { answers: [0, 9] } })).status, 400, 'option out of range');
    const fail = await app.call(`/api/me/assignments/${mine.id}/submit`, { method: 'POST', token: amara, body: { answers: [1, 0] } });
    assert.equal(fail.data.score, 0); assert.equal(fail.data.passed, false);
    const pass = await app.call(`/api/me/assignments/${mine.id}/submit`, { method: 'POST', token: amara, body: { answers: [0, 1] } });
    assert.equal(pass.data.score, 100); assert.equal(pass.data.passed, true);
    const after = (await app.call('/api/me/assignments', { token: amara })).data.assignments.find(a => a.id === mine.id);
    assert.equal(after.status, 'completed'); assert.equal(after.attempts, 2); assert.equal(after.best_score, 100);
    // a later lower score does not reduce the best score or un-complete the activity
    await app.call(`/api/me/assignments/${mine.id}/submit`, { method: 'POST', token: amara, body: { answers: [1, 0] } });
    const again = (await app.call('/api/me/assignments', { token: amara })).data.assignments.find(a => a.id === mine.id);
    assert.equal(again.status, 'completed'); assert.equal(again.best_score, 100); assert.equal(again.score, 0);
  });

  test('simulation runs are computed on the server and persisted', async () => {
    const act = await app.call('/api/activities', { method: 'POST', token: admin, body: {
      title: 'Range lab', type: 'simulation', pass_mark: 100, content: { targetDistance: 40, tolerance: 2, questions: [] } } });
    const me = (await app.call('/api/auth/me', { token: amara })).data.user;
    await app.call(`/api/activities/${act.data.id}/assign`, { method: 'POST', token: admin, body: { learnerIds: [me.id] } });
    const asg = (await app.call('/api/me/assignments', { token: amara })).data.assignments.find(a => a.activity_id === act.data.id);
    const url = `/api/me/assignments/${asg.id}`;

    assert.equal((await app.call(`${url}/submit`, { method: 'POST', token: amara, body: { answers: [] } })).status, 400, 'must launch first');
    assert.equal((await app.call(`${url}/simulation-runs`, { method: 'POST', token: amara, body: { angle: 95, speed: 10 } })).status, 400);
    const miss = await app.call(`${url}/simulation-runs`, { method: 'POST', token: amara, body: { angle: 45, speed: 10, hit: true, range: 40 } });
    assert.equal(miss.status, 201); assert.equal(miss.data.hit, false, 'client-sent "hit" is ignored');
    const hit = await app.call(`${url}/simulation-runs`, { method: 'POST', token: amara, body: { angle: 45, speed: 19.8 } });
    assert.equal(hit.data.hit, true); assert.equal(hit.data.range, 40);

    const r1 = await app.call(`${url}/submit`, { method: 'POST', token: amara, body: { answers: [], simulationRunId: miss.data.id } });
    assert.equal(r1.data.passed, false);
    const r2 = await app.call(`${url}/submit`, { method: 'POST', token: amara, body: { answers: [], simulationRunId: hit.data.id } });
    assert.equal(r2.data.passed, true); assert.equal(r2.data.simulation.hit, true);

    const runs = app.db.prepare('SELECT * FROM simulation_runs WHERE assignment_id = ?').all(asg.id);
    assert.equal(runs.length, 2, 'both launches stored');
    const linked = app.db.prepare('SELECT simulation_run_id FROM attempts WHERE assignment_id = ? ORDER BY id').all(asg.id).map(r => r.simulation_run_id);
    assert.deepEqual(linked, [miss.data.id, hit.data.id]);
    const adminView = await app.call(`/api/learners/${me.id}`, { token: admin });
    assert.ok(adminView.data.simulationRuns.length >= 2);
  });

  test('learners cannot see or act on other learners\' assignments', async () => {
    const liam = await app.login('liam@nudle.edu', 'learner123');
    const mine = new Set((await app.call('/api/me/assignments', { token: amara })).data.assignments.map(a => a.id));
    const theirs = (await app.call('/api/me/assignments', { token: liam })).data.assignments.find(a => !mine.has(a.id));
    for (const [path, method] of [['', 'GET'], ['/start', 'POST'], ['/submit', 'POST'], ['/simulation-runs', 'POST']]) {
      assert.equal((await app.call(`/api/me/assignments/${theirs.id}${path}`, { method, token: amara, body: method === 'POST' ? {} : undefined })).status, 404);
    }
  });

  test('deleting an activity cascades to its assignments', async () => {
    const act = await app.call('/api/activities', { method: 'POST', token: admin, body: { title: 'Temp', type: 'lesson', content: { sections: [{ heading: 'H', body: 'B' }] } } });
    await app.call(`/api/activities/${act.data.id}/assign`, { method: 'POST', token: admin, body: { cohort: 'Grade 10A' } });
    assert.equal((await app.call(`/api/activities/${act.data.id}`, { method: 'DELETE', token: admin })).status, 204);
    assert.equal(app.db.prepare('SELECT COUNT(*) c FROM assignments WHERE activity_id = ?').get(act.data.id).c, 0);
  });
});
