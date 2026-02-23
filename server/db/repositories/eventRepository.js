/**
 * Event repository — persist Okta webhook events and manage deduplication.
 */

const db = require('../knex');
const { randomUUID } = require('crypto');

/**
 * Check if an event with this Okta UUID was already processed.
 * Replaces the in-memory processedEventUUIDs Set.
 */
async function isDuplicate(oktaUuid) {
  if (!oktaUuid) return false;
  const row = await db('events').where({ okta_uuid: oktaUuid }).first();
  return Boolean(row);
}

/**
 * Persist a processed event.
 */
async function recordEvent({ demoId, oktaUuid, eventType, eventTimestamp, eventData }) {
  const id = randomUUID();
  await db('events').insert({
    id,
    demo_id: demoId,
    okta_uuid: oktaUuid || null,
    event_type: eventType,
    event_timestamp: eventTimestamp || null,
    event_data: eventData ? JSON.stringify(eventData) : null
  });
  return id;
}

async function findByDemo(demoId) {
  const rows = await db('events').where({ demo_id: demoId }).orderBy('received_at', 'asc');
  return rows.map(parseRow);
}

function parseRow(row) {
  return {
    ...row,
    event_data: row.event_data ? JSON.parse(row.event_data) : null
  };
}

module.exports = { isDuplicate, recordEvent, findByDemo };
