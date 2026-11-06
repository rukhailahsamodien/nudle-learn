// Unit tests for pure logic: grading, physics, validation, tokens, passwords.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { projectileRange, evaluateLaunch, gradeSubmission } = require('../server/services/grading');
const v = require('../server/utils/validate');
const { createTokenService } = require('../server/utils/token');
const { hashPassword, verifyPassword } = require('../server/utils/password');
const { summarize } = require('../server/services/mappers');

test('projectile range follows R = v²·sin(2θ)/g', () => {
  assert.ok(Math.abs(projectileRange(45, 19.8, 9.8) - 40.0) < 0.05);
  assert.ok(Math.abs(projectileRange(30, 20, 9.8) - projectileRange(60, 20, 9.8)) < 1e-9, 'complementary angles give equal range');
});

test('evaluateLaunch applies tolerance', () => {
  const c = { targetDistance: 40, tolerance: 2 };
  assert.equal(evaluateLaunch({ angle: 45, speed: 19.8 }, c, 9.8).hit, true);
  assert.equal(evaluateLaunch({ angle: 45, speed: 15 }, c, 9.8).hit, false);
});

test('gradeSubmission combines simulation and questions equally', () => {
  const qs = [{ options: ['a', 'b'], answer: 0 }, { options: ['a', 'b'], answer: 1 }];
  assert.equal(gradeSubmission({ type: 'quiz', questions: qs }, [0, 1]).score, 100);
  assert.equal(gradeSubmission({ type: 'quiz', questions: qs }, [0, 0]).score, 50);
  assert.equal(gradeSubmission({ type: 'simulation', questions: qs }, [0, 1], false).score, 50);
  assert.equal(gradeSubmission({ type: 'simulation', questions: [] }, [], true).score, 100);
  assert.equal(gradeSubmission({ type: 'lesson', questions: [] }, []).score, 100);
});

test('validators reject bad input with 400 errors', () => {
  assert.throws(() => v.id('abc'), { status: 400 });
  assert.throws(() => v.id('-1'), { status: 400 });
  assert.equal(v.id('7'), 7);
  assert.throws(() => v.email('nope'), { status: 400 });
  assert.equal(v.email('  A@B.io '), 'a@b.io');
  assert.throws(() => v.date('2026-13-45'), { status: 400 });
  assert.throws(() => v.string('x'.repeat(10), 'Name', { max: 5 }), { status: 400 });
  assert.throws(() => v.int('1.5', 'n'), { status: 400 });
});

test('tokens: valid, tampered and expired', () => {
  const t = createTokenService('s', 1000);
  const token = t.issue({ id: 1, role: 'admin' });
  assert.equal(t.verify(token).sub, 1);
  assert.equal(t.verify(token.slice(0, -2) + 'xx'), null);
  assert.equal(createTokenService('other', 1000).verify(token), null);
  assert.equal(createTokenService('s', -1).verify(createTokenService('s', -1).issue({ id: 1, role: 'a' })), null);
});

test('passwords are salted and verified', () => {
  const a = hashPassword('secret1'); const b = hashPassword('secret1');
  assert.notEqual(a, b);
  assert.ok(verifyPassword('secret1', a));
  assert.ok(!verifyPassword('wrong', a));
});

test('summarize computes rates and averages', () => {
  const s = summarize([{ status: 'completed', best_score: 80 }, { status: 'completed', best_score: 61 }, { status: 'in_progress' }, { status: 'assigned' }]);
  assert.deepEqual(s, { total: 4, completed: 2, inProgress: 1, notStarted: 1, completionRate: 50, averageScore: 71 });
});
