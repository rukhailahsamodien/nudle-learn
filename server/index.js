// Entry point: open the database, seed demo data on first run, start the HTTP server.
const config = require('./config');
const { openDb } = require('./db/connection');
const { seed } = require('./db/seed');
const { createApp } = require('./app');

const db = openDb(config.dbFile);
if (seed(db)) console.log('Seeded demo data (admin@nudle.edu / admin123, amara@nudle.edu / learner123)');

const server = createApp(db).listen(config.port, () => console.log(`Nudle Learn running on http://localhost:${config.port}`));

// Graceful shutdown so the database is closed cleanly.
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => server.close(() => { db.close(); process.exit(0); }));
