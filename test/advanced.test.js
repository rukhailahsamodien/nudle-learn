// Challenge 5 – advanced features: live updates, analytics, progress saving, audit log,
// exports, configurable scenarios and robustness (idempotency, timeouts, bad input).
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { startServer } = require('./helpers');
const { cell } = require('../server/services/reportService');

let app, admin, amara, amaraId;
before(async () => {
  app = await startServer();
  admin = await app.login('admin@nudle.edu', 'admin123');
  amara = await app.login('amara@nudle.edu', 'learner123');
  amaraId = (await app.call('/api/auth/me', { token: amara })).data.user.id;
});
after(() => app.close());

// Creates a simulation activity with the given scenario and assigns it to Amara; returns the assignment id.
async function simAssignment(content, extra = {}) {
  const act = await app.call('/api/activities', { method: 'POST', token: admin, body: { title: 'Scenario lab', type: 'simulation', pass_mark: 100, content: { questions: [], ...content }, ...extra } });
  assert.equal(act.status, 201, JSON.stringify(act.data));
  await app.call(`/api/activities/${act.data.id}/assign`, { method: 'POST', token: admin, body: { learnerIds: [amaraId] } });
  const asg = (await app.call('/api/me/assignments', { token: amara })).data.assignments.find(a => a.activity_id === act.data.id);
  return { activity: act.data, id: asg.id };
}

describe('real-time dashboard updates (Server-Sent Events)', () => {
  test('admin receives a live event when a learner launches a simulation', async () => {
    const { id } = await simAssignment({ targetDistance: 40, tolerance: 2 });
    const url = new URL('/api/admin/events', app.base);
    const received = await new Promise((resolve, reject) => {
      const req = http.get(url, { headers: { Authorization: `Bearer ${admin}` } }, (res) => {
        if (!/^text\/event-stream/.test(res.headers['content-type'])) { req.destroy(); return reject(new Error('wrong content type')); }
        let buf = '';
        res.on('data', async (chunk) => {
          buf += chunk;
          if (buf.includes('event: hello') && !buf.includes('launched')) {
            await app.call(`/api/me/assignments/${id}/simulation-runs`, { method: 'POST', token: amara, body: { angle: 45, speed: 19.8 } });
          }
          const m = buf.match(/event: change\ndata: (.*)\n/);
          if (m) { req.destroy(); resolve(JSON.parse(m[1])); }
        });
      });
      req.on('error', (e) => { if (e.code !== 'ECONNRESET') reject(e); });
      setTimeout(() => reject(new Error('no event received')), 4000);
    });
    assert.equal(received.action, 'simulation.launch');
    assert.match(received.summary, /Amara Okafor launched/);
  });
  test('the live stream is admin-only', async () => {
    assert.equal((await app.call('/api/admin/events', { token: amara })).status, 403);
    assert.equal((await app.call('/api/admin/events')).status, 401);
  });
  test('closing the stream removes its listener (no leaks)', async () => {
    await new Promise(r => setTimeout(r, 50));
    assert.equal(app.events.listenerCount(), 0);
  });
});

describe('visual analytics', () => {
  test('returns continuous time series and consistent breakdowns', async () => {
    const { status, data } = await app.call('/api/admin/analytics?days=14', { token: admin });
    assert.equal(status, 200);
    assert.equal(data.completionsByDay.length, 14, 'one point per day, gaps filled with 0');
    assert.ok(data.completionsByDay.every(d => /^\d{4}-\d{2}-\d{2}$/.test(d.day) && Number.isInteger(d.value)));
    const stats = (await app.call('/api/admin/stats', { token: admin })).data;
    assert.equal(data.scoreDistribution.reduce((n, b) => n + b.count, 0), stats.completed, 'every completion is in exactly one score bucket');
    assert.equal(data.scoreDistribution.length, 6);
    assert.ok(data.activityPerformance.every(a => a.completionRate >= 0 && a.completionRate <= 100));
    assert.ok(data.cohortPerformance.length >= 2);
  });
  test('rejects an invalid range', async () => {
    assert.equal((await app.call('/api/admin/analytics?days=1000', { token: admin })).status, 400);
  });
});

describe('simulation progress saving and resuming', () => {
  test('progress is saved, returned on reopen, validated, and cleared after passing', async () => {
    const { id } = await simAssignment({ targetDistance: 40, tolerance: 2, questions: [{ q: 'Best angle?', options: ['30°', '45°'], answer: 1 }] });
    const saved = await app.call(`/api/me/assignments/${id}/progress`, { method: 'PUT', token: amara, body: { angle: 33, speed: 21.5, answers: [1] } });
    assert.equal(saved.status, 200); assert.ok(saved.data.savedAt);
    const reopened = await app.call(`/api/me/assignments/${id}`, { token: amara });
    assert.deepEqual({ angle: reopened.data.progress.angle, speed: reopened.data.progress.speed, answers: reopened.data.progress.answers }, { angle: 33, speed: 21.5, answers: [1] });
    assert.equal(reopened.data.status, 'in_progress', 'saving progress marks the activity as started');
    assert.equal((await app.call(`/api/me/assignments/${id}/progress`, { method: 'PUT', token: amara, body: { answers: [5] } })).status, 400);
    assert.equal((await app.call(`/api/me/assignments/${id}/progress`, { method: 'PUT', token: amara, body: { angle: 'abc' } })).status, 400);
    await app.call(`/api/me/assignments/${id}/simulation-runs`, { method: 'POST', token: amara, body: { angle: 45, speed: 19.8 } });
    const r = await app.call(`/api/me/assignments/${id}/submit`, { method: 'POST', token: amara, body: { answers: [1] } });
    assert.equal(r.data.passed, true);
    assert.equal((await app.call(`/api/me/assignments/${id}`, { token: amara })).data.progress, null, 'progress cleared once completed');
  });
  test('learners cannot save progress on someone else\'s assignment', async () => {
    const liam = await app.login('liam@nudle.edu', 'learner123');
    const mine = new Set((await app.call('/api/me/assignments', { token: amara })).data.assignments.map(a => a.id));
    const theirs = (await app.call('/api/me/assignments', { token: liam })).data.assignments.find(a => !mine.has(a.id));
    assert.equal((await app.call(`/api/me/assignments/${theirs.id}/progress`, { method: 'PUT', token: amara, body: { angle: 40 } })).status, 404);
  });
});

describe('activity history and audit logging', () => {
  test('actions are recorded with actor, entity and summary', async () => {
    const created = await app.call('/api/learners', { method: 'POST', token: admin, body: { name: 'Audit Person', email: 'audit@x.io', password: 'secret1' } });
    await app.call(`/api/learners/${created.data.id}/status`, { method: 'PATCH', token: admin, body: { active: false } });
    await app.call('/api/auth/login', { method: 'POST', body: { email: 'admin@nudle.edu', password: 'wrong-password' } });
    const log = (await app.call('/api/admin/audit?limit=50', { token: admin })).data;
    const actions = log.rows.map(r => r.action);
    for (const a of ['learner.create', 'learner.deactivate', 'auth.login_failed', 'auth.login']) assert.ok(actions.includes(a), `missing ${a}`);
    const entry = log.rows.find(r => r.action === 'learner.create');
    assert.equal(entry.actor_name, 'Admin User'); assert.equal(entry.entity_id, created.data.id); assert.match(entry.summary, /Audit Person/);
    assert.ok(!JSON.stringify(log).includes('wrong-password'), 'passwords are never logged');
  });
  test('filtering and pagination', async () => {
    const page = (await app.call('/api/admin/audit?action=learner&limit=1&page=1', { token: admin })).data;
    assert.equal(page.rows.length, 1); assert.ok(page.total >= 2); assert.equal(page.pages, page.total);
    assert.ok(page.rows.every(r => r.action.startsWith('learner')));
    assert.ok(page.actions.length > 0);
    assert.equal((await app.call('/api/admin/audit?from=not-a-date', { token: admin })).status, 400);
  });
  test('learner detail includes that learner\'s activity history', async () => {
    const d = (await app.call(`/api/learners/${amaraId}`, { token: admin })).data;
    assert.ok(d.activityLog.some(e => e.action === 'simulation.launch'));
  });
  test('the audit log is admin-only', async () => {
    assert.equal((await app.call('/api/admin/audit', { token: amara })).status, 403);
  });
});

describe('exportable learner performance reports', () => {
  test('all-learner CSV report downloads with correct headers and rows', async () => {
    const res = await fetch(app.base + '/api/reports/learners.csv', { headers: { Authorization: `Bearer ${admin}` } });
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type'), /text\/csv/);
    assert.match(res.headers.get('content-disposition'), /attachment; filename="nudle-learner-performance-\d{4}-\d{2}-\d{2}\.csv"/);
    const lines = (await res.text()).replace(/^﻿/, '').trim().split('\r\n');
    assert.equal(lines[0], 'Name,Email,Cohort,Status,Assigned,Completed,In progress,Overdue,Completion rate,Average score,Attempts,Last login');
    assert.ok(lines.some(l => l.startsWith('Amara Okafor,amara@nudle.edu')));
  });
  test('single-learner CSV report', async () => {
    const res = await fetch(app.base + `/api/reports/learners/${amaraId}.csv`, { headers: { Authorization: `Bearer ${admin}` } });
    assert.equal(res.status, 200);
    const text = await res.text();
    assert.match(text, /Learner,Amara Okafor/); assert.match(text, /Activity,Type,Subject,Status/);
    assert.equal((await fetch(app.base + '/api/reports/learners/99999.csv', { headers: { Authorization: `Bearer ${admin}` } })).status, 404);
    assert.equal((await fetch(app.base + '/api/reports/learners.csv', { headers: { Authorization: `Bearer ${amara}` } })).status, 403);
  });
  test('CSV cells are quoted and protected against formula injection', () => {
    assert.equal(cell('=HYPERLINK("x")'), '"\'=HYPERLINK(""x"")"');
    assert.equal(cell('Smith, Jo'), '"Smith, Jo"');
    assert.equal(cell('+27 82'), "'+27 82");
    assert.equal(cell(null), '');
  });
});

describe('configurable simulation scenarios', () => {
  test('server grades with the scenario gravity (Moon)', async () => {
    const { id } = await simAssignment({ targetDistance: 40, tolerance: 2, planet: 'moon', speedMax: 20 });
    // On the Moon, 45° at 8.05 m/s → 8.05² / 1.62 ≈ 40 m. On Earth it would only reach ~6.6 m.
    const run = await app.call(`/api/me/assignments/${id}/simulation-runs`, { method: 'POST', token: amara, body: { angle: 45, speed: 8.05 } });
    assert.equal(run.data.hit, true, JSON.stringify(run.data));
  });
  test('custom gravity, launch ranges and launch limit are enforced', async () => {
    const { id } = await simAssignment({ targetDistance: 30, tolerance: 2, planet: 'custom', gravity: 5, angleMin: 20, angleMax: 60, speedMin: 5, speedMax: 20, maxLaunches: 2 });
    const url = `/api/me/assignments/${id}/simulation-runs`;
    assert.equal((await app.call(url, { method: 'POST', token: amara, body: { angle: 70, speed: 10 } })).status, 400, 'angle outside scenario range');
    assert.equal((await app.call(url, { method: 'POST', token: amara, body: { angle: 45, speed: 30 } })).status, 400, 'speed outside scenario range');
    assert.equal((await app.call(url, { method: 'POST', token: amara, body: { angle: 45, speed: 10 } })).status, 201);
    assert.equal((await app.call(url, { method: 'POST', token: amara, body: { angle: 45, speed: 12 } })).status, 201);
    const third = await app.call(url, { method: 'POST', token: amara, body: { angle: 45, speed: 12.2 } });
    assert.equal(third.status, 409); assert.match(third.data.error, /all 2 launches/);
    const detail = (await app.call(`/api/me/assignments/${id}`, { token: amara })).data;
    assert.equal(detail.launchesUsed, 2); assert.equal(detail.content.gravity, 5);
  });
  test('impossible or inconsistent scenarios are rejected', async () => {
    const bad = [
      { targetDistance: 150, tolerance: 1, speedMax: 10 },            // unreachable
      { targetDistance: 40, tolerance: 2, angleMin: 60, angleMax: 30 },
      { targetDistance: 40, tolerance: 2, planet: 'pluto' },
      { targetDistance: 40, tolerance: 2, planet: 'custom' },          // custom without gravity
      { targetDistance: 40, tolerance: 2, maxLaunches: -1 },
    ];
    for (const content of bad) {
      const r = await app.call('/api/activities', { method: 'POST', token: admin, body: { title: 'Bad lab', type: 'simulation', content } });
      assert.equal(r.status, 400, JSON.stringify(content));
    }
  });
});

describe('robust handling of invalid or interrupted requests', () => {
  test('a retried submission with the same Idempotency-Key is not counted twice', async () => {
    const { id } = await simAssignment({ targetDistance: 40, tolerance: 2 });
    await app.call(`/api/me/assignments/${id}/simulation-runs`, { method: 'POST', token: amara, body: { angle: 45, speed: 19.8 } });
    const send = () => fetch(app.base + `/api/me/assignments/${id}/submit`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${amara}`, 'Idempotency-Key': 'submit-test-key-0001' }, body: '{"answers":[]}',
    });
    const first = await send(); const second = await send();
    assert.equal(first.status, 200); assert.equal(second.status, 200);
    assert.equal(second.headers.get('idempotent-replayed'), 'true');
    assert.deepEqual(await first.json(), await second.json());
    const attempts = app.db.prepare('SELECT COUNT(*) AS c FROM attempts WHERE assignment_id = ?').get(id).c;
    assert.equal(attempts, 1, 'only one attempt recorded');
  });
  test('idempotency keys are validated and cannot be reused for another route', async () => {
    const bad = await fetch(app.base + '/api/me/assignments/1/submit', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${amara}`, 'Idempotency-Key': 'x' }, body: '{}' });
    assert.equal(bad.status, 400);
    const other = await fetch(app.base + '/api/me/assignments/2/submit', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${amara}`, 'Idempotency-Key': 'submit-test-key-0001' }, body: '{}' });
    assert.equal(other.status, 400);
  });
  test('slow requests time out with a clear 503 instead of hanging', async () => {
    const { requestTimeout } = require('../server/middleware/timeout');
    const { EventEmitter } = require('node:events');
    const res = Object.assign(new EventEmitter(), { headersSent: false });
    const err = await new Promise((resolve) => {
      const mw = requestTimeout(20);
      mw({ path: '/api/slow' }, res, (e) => { if (e) resolve(e); }); // handler never finishes
    });
    assert.equal(err.status, 503); assert.equal(err.code, 'TIMEOUT');
    // A request that finishes in time is not affected.
    const res2 = Object.assign(new EventEmitter(), { headersSent: false }); let called = 0;
    requestTimeout(20)({ path: '/api/fast' }, res2, (e) => { if (e) called++; });
    res2.emit('finish'); await new Promise(r => setTimeout(r, 40));
    assert.equal(called, 0);
  });
  test('wrong content types, oversized bodies and junk are rejected cleanly', async () => {
    const big = await fetch(app.base + '/api/learners', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${admin}` }, body: JSON.stringify({ name: 'x'.repeat(300000) }) });
    assert.equal(big.status, 413);
    const text = await fetch(app.base + '/api/learners', { method: 'POST', headers: { 'Content-Type': 'text/plain', Authorization: `Bearer ${admin}` }, body: 'hello' });
    assert.equal(text.status, 400);
    const arr = await app.call('/api/learners', { method: 'POST', token: admin, body: [1, 2, 3] });
    assert.equal(arr.status, 400);
  });
  test('a client disconnecting mid-request does not crash the server', async () => {
    await new Promise((resolve) => {
      const req = http.request(new URL('/api/learners', app.base), { method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': 1000, Authorization: `Bearer ${admin}` } });
      req.on('error', () => resolve());
      req.write('{"name":"half'); setTimeout(() => { req.destroy(); resolve(); }, 50);
    });
    assert.equal((await app.call('/api/health')).status, 200, 'server still healthy');
  });
});
