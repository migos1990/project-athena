/**
 * Audit log repository — immutable append-only record of all actions.
 */

const db = require('../knex');
const { randomUUID } = require('crypto');

/**
 * Record an action to the audit log.
 *
 * @param {object} entry
 * @param {string} entry.actor    - API key fingerprint, user email, or 'system'
 * @param {string} entry.action   - e.g. 'start_demo', 'launch_attack', 'webhook_received'
 * @param {string} [entry.resource] - resource identifier (demo ID, attack type)
 * @param {string} entry.result   - 'success' | 'failure'
 * @param {object} [entry.details] - arbitrary additional context
 */
async function log({ actor, action, resource, result, details } = {}) {
  await db('audit_log').insert({
    id: randomUUID(),
    actor: actor || 'unknown',
    action,
    resource: resource || null,
    result,
    details: details ? JSON.stringify(details) : null
  });
}

async function recent(limit = 100) {
  const rows = await db('audit_log').orderBy('timestamp', 'desc').limit(limit);
  return rows.map(row => ({
    ...row,
    details: row.details ? JSON.parse(row.details) : null
  }));
}

module.exports = { log, recent };
