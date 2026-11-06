// Pure grading functions (no DB access) so they are easy to unit-test.

// Ideal projectile range on flat ground: R = v² · sin(2θ) / g
function projectileRange(angleDeg, speed, g) {
  return (speed * speed * Math.sin((2 * angleDeg * Math.PI) / 180)) / g;
}

function evaluateLaunch({ angle, speed }, content, g) {
  const range = Math.round(projectileRange(angle, speed, g) * 10) / 10;
  const hit = Math.abs(range - content.targetDistance) <= content.tolerance;
  return { range, hit, target: content.targetDistance };
}

// questions: [{ options, answer }]; answers: array of chosen option indexes.
// simulationHit: true/false for simulation activities, undefined otherwise.
function gradeSubmission({ type, questions = [] }, answers, simulationHit) {
  const feedback = questions.map((q, i) => ({ correct: answers[i] === q.answer, correctAnswer: q.answer }));
  const correct = feedback.filter(f => f.correct).length;
  const parts = [];
  if (type === 'simulation') parts.push(simulationHit ? 1 : 0);
  if (questions.length) parts.push(correct / questions.length);
  // A reading-only lesson (no questions) is complete once submitted.
  const score = parts.length ? Math.round((parts.reduce((a, b) => a + b, 0) / parts.length) * 100) : 100;
  return { score, correct, total: questions.length, feedback };
}

module.exports = { projectileRange, evaluateLaunch, gradeSubmission };
