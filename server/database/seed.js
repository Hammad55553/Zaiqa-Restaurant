const { db, initDb } = require('./db');

// Initialize database
initDb();

console.log('Database initialized. Static seeding data has been removed.');
