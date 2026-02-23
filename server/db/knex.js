/**
 * Knex database connection.
 *
 * In development (NODE_ENV !== 'production') uses SQLite via better-sqlite3
 * so there is no external dependency to run locally.
 *
 * In production set DATABASE_URL to a PostgreSQL connection string:
 *   postgres://user:pass@host:5432/dbname
 *
 * The same Knex query syntax works against both drivers — the only
 * driver-specific concern is migrations, which use standard SQL types.
 */

const knex = require('knex');
const path = require('path');

const isProd = process.env.NODE_ENV === 'production';
const databaseUrl = process.env.DATABASE_URL;

let config;

if (isProd) {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required in production (postgres://...)');
  }
  config = {
    client: 'pg',
    connection: databaseUrl,
    pool: { min: 2, max: 10 },
    migrations: { directory: path.join(__dirname, 'migrations') }
  };
} else {
  // SQLite for local development — no external dependency required
  const dbPath = process.env.SQLITE_PATH || path.join(__dirname, 'athena-dev.sqlite3');
  config = {
    client: 'better-sqlite3',
    connection: { filename: dbPath },
    useNullAsDefault: true,
    migrations: { directory: path.join(__dirname, 'migrations') }
  };
}

const db = knex(config);

module.exports = db;
