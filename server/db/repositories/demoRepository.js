/**
 * Demo repository — CRUD for the demos table.
 */

const db = require('../knex');
const { randomUUID } = require('crypto');

async function createDemo({ oktaOrg, createdBy } = {}) {
  const id = randomUUID();
  await db('demos').insert({
    id,
    okta_org: oktaOrg || null,
    created_by: createdBy || null,
    status: 'idle'
  });
  return findById(id);
}

async function findById(id) {
  return db('demos').where({ id }).first();
}

async function findLatest() {
  return db('demos').orderBy('created_at', 'desc').first();
}

async function markStarted(id) {
  await db('demos').where({ id }).update({
    started_at: new Date().toISOString(),
    status: 'active'
  });
  return findById(id);
}

async function markReset(id) {
  await db('demos').where({ id }).update({
    reset_at: new Date().toISOString(),
    status: 'reset'
  });
  return findById(id);
}

module.exports = { createDemo, findById, findLatest, markStarted, markReset };
