/**
 * Database initialisation entry point.
 *
 * Call `initDb()` once at server startup. It runs any pending Knex migrations
 * then exports the repository layer for use throughout the application.
 */

const db = require('./knex');

async function initDb() {
  try {
    await db.migrate.latest();
    console.log('✅  Database migrations up to date');
  } catch (err) {
    console.error('❌  Database migration failed:', err.message);
    throw err;
  }
}

module.exports = {
  initDb,
  db,
  demos:    require('./repositories/demoRepository'),
  events:   require('./repositories/eventRepository'),
  useCases: require('./repositories/useCaseRepository'),
  attacks:  require('./repositories/attackRepository'),
  audit:    require('./repositories/auditRepository')
};
