// Database connection + schema migrations (Node's built-in SQLite, Node >= 22.5).
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

// Each migration runs once; PRAGMA user_version records how far the DB has been migrated.
const MIGRATIONS = [
  // v1 – core schema (Challenge 1)
  `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('admin','learner')),
      cohort TEXT,
      active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_login TEXT
    );
    CREATE TABLE IF NOT EXISTS activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      type TEXT NOT NULL CHECK (type IN ('lesson','quiz','simulation')),
      subject TEXT,
      duration_min INTEGER DEFAULT 10,
      pass_mark INTEGER NOT NULL DEFAULT 50 CHECK (pass_mark BETWEEN 0 AND 100),
      content TEXT NOT NULL,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      activity_id INTEGER NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
      learner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      due_date TEXT,
      status TEXT NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned','in_progress','completed')),
      score INTEGER,
      best_score INTEGER,
      attempts INTEGER NOT NULL DEFAULT 0,
      assigned_at TEXT NOT NULL DEFAULT (datetime('now')),
      started_at TEXT,
      completed_at TEXT,
      UNIQUE (activity_id, learner_id)
    );
    CREATE TABLE IF NOT EXISTS attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      assignment_id INTEGER NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
      score INTEGER NOT NULL,
      passed INTEGER NOT NULL,
      answers TEXT,
      submitted_at TEXT NOT NULL DEFAULT (datetime('now'))
    );`,
  // v2 – persistent simulation results + indexes (Challenge 3)
  `CREATE TABLE IF NOT EXISTS simulation_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      assignment_id INTEGER NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
      angle REAL NOT NULL,
      speed REAL NOT NULL,
      range_m REAL NOT NULL,
      target_m REAL NOT NULL,
      hit INTEGER NOT NULL CHECK (hit IN (0,1)),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    ALTER TABLE attempts ADD COLUMN simulation_run_id INTEGER REFERENCES simulation_runs(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_assignments_learner ON assignments(learner_id);
    CREATE INDEX IF NOT EXISTS idx_assignments_activity ON assignments(activity_id);
    CREATE INDEX IF NOT EXISTS idx_attempts_assignment ON attempts(assignment_id);
    CREATE INDEX IF NOT EXISTS idx_simruns_assignment ON simulation_runs(assignment_id);`,
  // v3 – audit log, saved progress, idempotency keys (Challenge 5)
  `CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      actor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      actor_name TEXT,
      actor_role TEXT,
      action TEXT NOT NULL,
      entity TEXT,
      entity_id INTEGER,
      summary TEXT NOT NULL,
      details TEXT,
      ip TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at);
    CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_log(actor_id);
    CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log(action);
    CREATE TABLE IF NOT EXISTS assignment_progress (
      assignment_id INTEGER PRIMARY KEY REFERENCES assignments(id) ON DELETE CASCADE,
      state TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS idempotency_keys (
      key TEXT NOT NULL,
      user_id INTEGER NOT NULL,
      route TEXT NOT NULL,
      status INTEGER NOT NULL,
      body TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (key, user_id)
    );`,
];

function migrate(db) {
  const current = db.prepare('PRAGMA user_version').get().user_version;
  for (let v = current; v < MIGRATIONS.length; v++) {
    transaction(db, () => {
      db.exec(MIGRATIONS[v]);
      db.exec(`PRAGMA user_version = ${v + 1}`);
    });
  }
}

// Runs fn inside a transaction; rolls back on any error so multi-step writes are all-or-nothing.
function transaction(db, fn) {
  db.exec('BEGIN');
  try { const r = fn(); db.exec('COMMIT'); return r; }
  catch (e) { db.exec('ROLLBACK'); throw e; }
}

function openDb(file) {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');
  migrate(db);
  return db;
}

module.exports = { openDb, transaction };
