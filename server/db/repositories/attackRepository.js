/**
 * Attack repository — persist Red Team attack events.
 */

const db = require('../knex');
const { randomUUID } = require('crypto');

async function recordAttack({ demoId, attackType, targetUseCase }) {
  const id = randomUUID();
  await db('attacks').insert({
    id,
    demo_id: demoId,
    attack_type: attackType,
    target_use_case: targetUseCase || null
  });
  return id;
}

async function markDetected(id) {
  await db('attacks').where({ id }).update({
    detection_triggered_at: new Date().toISOString()
  });
}

async function findByDemo(demoId) {
  return db('attacks').where({ demo_id: demoId }).orderBy('launched_at', 'asc');
}

module.exports = { recordAttack, markDetected, findByDemo };
