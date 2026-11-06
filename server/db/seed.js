// Seeds demo data when the database is empty.
const { hashPassword } = require('../utils/password');
const { transaction } = require('./connection');

const ACTIVITIES = [
  {
    title: 'Introduction to Fractions',
    description: 'Understand numerators, denominators and equivalent fractions.',
    type: 'lesson', subject: 'Mathematics', duration_min: 10, pass_mark: 60,
    content: {
      sections: [
        { heading: 'What is a fraction?', body: 'A fraction represents part of a whole. The top number (numerator) counts the parts you have; the bottom number (denominator) says how many equal parts make the whole.' },
        { heading: 'Equivalent fractions', body: 'Multiplying or dividing the numerator and denominator by the same number gives an equivalent fraction: 1/2 = 2/4 = 4/8.' },
      ],
      questions: [
        { q: 'In 3/5, what is the denominator?', options: ['3', '5', '8', '15'], answer: 1 },
        { q: 'Which fraction is equivalent to 1/2?', options: ['2/3', '3/6', '1/4', '2/5'], answer: 1 },
      ],
    },
  },
  {
    title: 'Photosynthesis Check',
    description: 'A short quiz on how plants make food.',
    type: 'quiz', subject: 'Science', duration_min: 8, pass_mark: 50,
    content: {
      questions: [
        { q: 'Which gas do plants absorb for photosynthesis?', options: ['Oxygen', 'Nitrogen', 'Carbon dioxide', 'Hydrogen'], answer: 2 },
        { q: 'Where in the cell does photosynthesis happen?', options: ['Nucleus', 'Chloroplast', 'Mitochondria', 'Ribosome'], answer: 1 },
        { q: 'What is a by-product of photosynthesis?', options: ['Oxygen', 'Salt', 'Carbon monoxide', 'Methane'], answer: 0 },
      ],
    },
  },
  {
    title: 'Projectile Motion Lab',
    description: 'Interactive simulation: launch a projectile and hit the target by adjusting angle and speed.',
    type: 'simulation', subject: 'Physics', duration_min: 15, pass_mark: 100,
    content: {
      simulation: 'projectile', targetDistance: 40, tolerance: 2,
      instructions: 'Adjust the launch angle and speed, then press Launch. Land within 2 m of the flag at 40 m to complete the lab. (g = 9.8 m/s²)',
      questions: [
        { q: 'Ignoring air resistance, which launch angle gives the maximum range?', options: ['30°', '45°', '60°', '90°'], answer: 1 },
      ],
    },
  },
  {
    title: 'Digital Safety Basics',
    description: 'Learn how to recognise phishing and protect your accounts.',
    type: 'lesson', subject: 'Digital Literacy', duration_min: 12, pass_mark: 50,
    content: {
      sections: [
        { heading: 'Strong passwords', body: 'Use long passphrases, never reuse passwords, and turn on two-factor authentication where possible.' },
        { heading: 'Spotting phishing', body: 'Be wary of urgent messages asking you to click links or share details. Check the sender address and hover over links before clicking.' },
      ],
      questions: [
        { q: 'Which is the strongest password?', options: ['password123', 'Summer2024', 'correct-horse-battery-staple', 'qwerty'], answer: 2 },
        { q: 'An email says your account will close unless you click a link now. What should you do?', options: ['Click it quickly', 'Verify via the official website', 'Reply with your password', 'Forward it to friends'], answer: 1 },
      ],
    },
  },
];

const LEARNERS = [
  ['Amara Okafor', 'amara@nudle.edu', 'Grade 10A'],
  ['Liam Chen', 'liam@nudle.edu', 'Grade 10A'],
  ['Sofia Martins', 'sofia@nudle.edu', 'Grade 10B'],
  ['Noah Dlamini', 'noah@nudle.edu', 'Grade 10B'],
  ['Priya Nair', 'priya@nudle.edu', 'Grade 11A'],
  ['Ethan Brooks', 'ethan@nudle.edu', 'Grade 11A'],
];

// SQLite datetime format (matches datetime('now')) so ordering by date is consistent.
const sqlTime = (msAgo) => new Date(Date.now() - msAgo).toISOString().slice(0, 19).replace('T', ' ');

function seed(db) {
  return transaction(db, () => seedData(db));
}

function seedData(db) {
  const count = db.prepare('SELECT COUNT(*) c FROM users').get().c;
  if (count > 0) return false;

  const insUser = db.prepare('INSERT INTO users (name,email,password_hash,role,cohort,active) VALUES (?,?,?,?,?,?)');
  const adminId = insUser.run('Admin User', 'admin@nudle.edu', hashPassword('admin123'), 'admin', null, 1).lastInsertRowid;
  const learnerIds = LEARNERS.map(([n, e, c], i) =>
    insUser.run(n, e, hashPassword('learner123'), 'learner', c, i === 5 ? 0 : 1).lastInsertRowid);

  const insAct = db.prepare('INSERT INTO activities (title,description,type,subject,duration_min,pass_mark,content,created_by) VALUES (?,?,?,?,?,?,?,?)');
  const actIds = ACTIVITIES.map(a =>
    insAct.run(a.title, a.description, a.type, a.subject, a.duration_min, a.pass_mark, JSON.stringify(a.content), adminId).lastInsertRowid);

  const insAsg = db.prepare(`INSERT INTO assignments (activity_id,learner_id,due_date,status,score,best_score,attempts,started_at,completed_at)
    VALUES (?,?,date('now', ?),?,?,?,?,?,?)`);
  // deterministic sample progress
  learnerIds.forEach((lid, li) => {
    actIds.forEach((aid, ai) => {
      if ((li + ai) % 4 === 3) return; // not every learner gets every activity
      const mode = (li * 3 + ai) % 3; // 0 completed, 1 in progress, 2 assigned
      const due = `+${7 + ai * 3} days`;
      if (mode === 0) {
        // simulations need a hit (pass mark 100); other scores always clear the pass mark
        const score = ACTIVITIES[ai].type === 'simulation' ? 100 : 60 + ((li * 7 + ai * 11) % 41);
        const done = sqlTime(86400000 * (li + 1));
        const asgId = insAsg.run(aid, lid, due, 'completed', score, score, 1, sqlTime(86400000 * (li + 2)), done).lastInsertRowid;
        let runId = null;
        if (ACTIVITIES[ai].type === 'simulation') {
          // a successful launch: 45° at 19.8 m/s lands at ~40 m
          runId = db.prepare('INSERT INTO simulation_runs (assignment_id, angle, speed, range_m, target_m, hit, created_at) VALUES (?,?,?,?,?,1,?)')
            .run(asgId, 45, 19.8, 40, 40, done).lastInsertRowid;
        }
        db.prepare('INSERT INTO attempts (assignment_id, score, passed, submitted_at, simulation_run_id) VALUES (?,?,1,?,?)').run(asgId, score, done, runId);
      } else if (mode === 1) {
        insAsg.run(aid, lid, due, 'in_progress', null, null, 0, sqlTime(0), null);
      } else {
        insAsg.run(aid, lid, due, 'assigned', null, null, 0, null, null);
      }
    });
  });
  return true;
}

module.exports = { seed };
