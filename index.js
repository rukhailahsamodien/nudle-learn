const { openDb } = require('./db');
const { seed } = require('./seed');
const { createApp } = require('./app');

const db = openDb();
if (seed(db)) console.log('Seeded demo data (admin@nudle.edu / admin123, amara@nudle.edu / learner123)');

const port = Number(process.env.PORT) || 3000;
createApp(db).listen(port, () => console.log(`Nudle Learn running on http://localhost:${port}`));
