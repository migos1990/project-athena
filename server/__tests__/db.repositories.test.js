/**
 * Integration tests for the database repository layer.
 * Uses an in-memory SQLite database — no external service required.
 */

process.env.SQLITE_PATH = ':memory:';

const { initDb, demos, events, useCases, attacks, audit } = require('../db');

beforeAll(async () => {
  await initDb();
});

afterAll(async () => {
  const db = require('../db/knex');
  await db.destroy();
});

describe('demoRepository', () => {
  let demoId;

  it('creates a demo and returns it', async () => {
    const demo = await demos.createDemo({ createdBy: 'test-user' });
    expect(demo).toMatchObject({ created_by: 'test-user', status: 'idle' });
    expect(demo.id).toBeTruthy();
    demoId = demo.id;
  });

  it('finds a demo by id', async () => {
    const found = await demos.findById(demoId);
    expect(found.id).toBe(demoId);
  });

  it('marks a demo as started', async () => {
    const updated = await demos.markStarted(demoId);
    expect(updated.status).toBe('active');
    expect(updated.started_at).toBeTruthy();
  });

  it('marks a demo as reset', async () => {
    const updated = await demos.markReset(demoId);
    expect(updated.status).toBe('reset');
    expect(updated.reset_at).toBeTruthy();
  });

  it('findLatest returns the most recently created demo', async () => {
    const latest = await demos.findLatest();
    expect(latest.id).toBe(demoId);
  });
});

describe('eventRepository', () => {
  let demoId;

  beforeAll(async () => {
    const demo = await demos.createDemo();
    demoId = demo.id;
  });

  it('isDuplicate returns false for a new UUID', async () => {
    expect(await events.isDuplicate('uuid-new-123')).toBe(false);
  });

  it('records an event', async () => {
    const id = await events.recordEvent({
      demoId,
      oktaUuid: 'uuid-new-123',
      eventType: 'user.session.start',
      eventData: { foo: 'bar' }
    });
    expect(id).toBeTruthy();
  });

  it('isDuplicate returns true after recording', async () => {
    expect(await events.isDuplicate('uuid-new-123')).toBe(true);
  });

  it('isDuplicate returns false for null UUID', async () => {
    expect(await events.isDuplicate(null)).toBe(false);
  });

  it('findByDemo returns recorded events', async () => {
    const list = await events.findByDemo(demoId);
    expect(list.length).toBeGreaterThanOrEqual(1);
    expect(list[0].event_data).toEqual({ foo: 'bar' });
  });
});

describe('useCaseRepository', () => {
  let demoId;

  beforeAll(async () => {
    const demo = await demos.createDemo();
    demoId = demo.id;
  });

  it('records a use case completion', async () => {
    const id = await useCases.recordUseCase({
      demoId,
      type: 'mfaLogin',
      eventData: { userEmail: 'test@example.com' },
      generatedContent: { title: 'MFA Login' }
    });
    expect(id).toBeTruthy();
  });

  it('findByDemo returns the use case with parsed JSON', async () => {
    const list = await useCases.findByDemo(demoId);
    expect(list.length).toBe(1);
    expect(list[0].type).toBe('mfaLogin');
    expect(list[0].event_data.userEmail).toBe('test@example.com');
    expect(list[0].generated_content.title).toBe('MFA Login');
  });
});

describe('attackRepository', () => {
  let demoId;
  let attackId;

  beforeAll(async () => {
    const demo = await demos.createDemo();
    demoId = demo.id;
  });

  it('records an attack', async () => {
    attackId = await attacks.recordAttack({
      demoId,
      attackType: 'password-spray',
      targetUseCase: 'itpRiskElevation'
    });
    expect(attackId).toBeTruthy();
  });

  it('findByDemo returns the attack', async () => {
    const list = await attacks.findByDemo(demoId);
    expect(list.length).toBe(1);
    expect(list[0].attack_type).toBe('password-spray');
    expect(list[0].detection_triggered_at).toBeNull();
  });

  it('marks an attack as detected', async () => {
    await attacks.markDetected(attackId);
    const list = await attacks.findByDemo(demoId);
    expect(list[0].detection_triggered_at).toBeTruthy();
  });
});

describe('auditRepository', () => {
  it('logs an action', async () => {
    await expect(
      audit.log({ actor: 'tester', action: 'test_action', resource: 'demo-1', result: 'success' })
    ).resolves.not.toThrow();
  });

  it('recent() returns log entries in reverse-chronological order', async () => {
    const entries = await audit.recent(5);
    expect(entries.length).toBeGreaterThanOrEqual(1);
    expect(entries[0].action).toBe('test_action');
  });

  it('parses details JSON correctly', async () => {
    await audit.log({ actor: 'tester', action: 'detail_test', result: 'success', details: { key: 'value' } });
    const entries = await audit.recent(1);
    expect(entries[0].details).toEqual({ key: 'value' });
  });
});
