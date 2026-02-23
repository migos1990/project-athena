/**
 * Use case repository — persist completed demo use cases.
 */

const db = require('../knex');
const { randomUUID } = require('crypto');

async function recordUseCase({ demoId, type, eventData, generatedContent }) {
  const id = randomUUID();
  await db('use_cases').insert({
    id,
    demo_id: demoId,
    type,
    completed_at: new Date().toISOString(),
    event_data: eventData ? JSON.stringify(eventData) : null,
    generated_content: generatedContent ? JSON.stringify(generatedContent) : null
  });
  return id;
}

async function findByDemo(demoId) {
  const rows = await db('use_cases').where({ demo_id: demoId }).orderBy('completed_at', 'asc');
  return rows.map(parseRow);
}

function parseRow(row) {
  return {
    ...row,
    event_data: row.event_data ? JSON.parse(row.event_data) : null,
    generated_content: row.generated_content ? JSON.parse(row.generated_content) : null
  };
}

module.exports = { recordUseCase, findByDemo };
