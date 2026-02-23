/**
 * Backend API security tests — Phase 1 & 3 coverage.
 *
 * Tests authentication, rate limiting behaviour, CORS, and input validation
 * without hitting the real Anthropic API or an external database.
 *
 * Environment setup:
 *   - SQLITE_PATH=:memory: uses an in-memory SQLite DB per test run
 *   - ANTHROPIC_API_KEY=test-key  prevents startup config validator from exiting
 *   - DEMO_API_KEY=test-api-key   sets the expected API key for auth tests
 */

process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
process.env.DEMO_API_KEY = 'test-api-key';
process.env.SQLITE_PATH = ':memory:';
process.env.ALLOWED_ORIGINS = 'http://localhost:5173';

const request = require('supertest');

// Import AFTER setting env vars so validateEnv() passes
let app;
beforeAll(async () => {
  // Use jest module isolation; re-require to pick up env vars
  ({ app } = require('../index'));
  // Give DB migrations a moment to complete
  await new Promise(r => setTimeout(r, 500));
});

afterAll(async () => {
  // Allow Jest to exit cleanly
  const { server } = require('../index');
  await new Promise(r => server.close(r));
});

// ─── Authentication ────────────────────────────────────────────────────────────

describe('Authentication — /attack', () => {
  it('returns 401 when X-API-Key header is missing', async () => {
    const res = await request(app)
      .post('/attack')
      .send({ attackType: 'password-spray' });
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/Missing X-API-Key/);
  });

  it('returns 403 when X-API-Key is wrong', async () => {
    const res = await request(app)
      .post('/attack')
      .set('X-API-Key', 'wrong-key')
      .send({ attackType: 'password-spray' });
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/Invalid API key/);
  });

  it('returns 200 when X-API-Key is correct', async () => {
    const res = await request(app)
      .post('/attack')
      .set('X-API-Key', 'test-api-key')
      .send({ attackType: 'password-spray' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('Authentication — /start-demo', () => {
  it('returns 401 when X-API-Key header is missing', async () => {
    const res = await request(app).post('/start-demo');
    expect(res.status).toBe(401);
  });

  it('returns 200 with valid key', async () => {
    const res = await request(app)
      .post('/start-demo')
      .set('X-API-Key', 'test-api-key');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('startTime');
    expect(res.body).toHaveProperty('demoId');
  });
});

describe('Authentication — /reset-demo', () => {
  it('returns 401 when X-API-Key header is missing', async () => {
    const res = await request(app).post('/reset-demo');
    expect(res.status).toBe(401);
  });
});

describe('Authentication — /debug-log', () => {
  it('returns 401 when X-API-Key header is missing', async () => {
    const res = await request(app).get('/debug-log');
    expect(res.status).toBe(401);
  });

  it('returns 200 with valid key', async () => {
    const res = await request(app)
      .get('/debug-log')
      .set('X-API-Key', 'test-api-key');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

// ─── Input Validation ─────────────────────────────────────────────────────────

describe('Input validation — /attack', () => {
  it('returns 400 when attackType is missing', async () => {
    const res = await request(app)
      .post('/attack')
      .set('X-API-Key', 'test-api-key')
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
    expect(res.body.details).toBeInstanceOf(Array);
  });

  it('returns 400 for an unknown attack type', async () => {
    const res = await request(app)
      .post('/attack')
      .set('X-API-Key', 'test-api-key')
      .send({ attackType: 'super-hacker-mode' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  it.each([
    'password-spray',
    'partially-offboarded',
    'credential-leaked',
    'cookie-theft'
  ])('accepts valid attack type: %s', async (attackType) => {
    const res = await request(app)
      .post('/attack')
      .set('X-API-Key', 'test-api-key')
      .send({ attackType });
    expect(res.status).toBe(200);
    expect(res.body.attack.attackType).toBe(attackType);
  });

  it('strips unknown fields from the request body', async () => {
    const res = await request(app)
      .post('/attack')
      .set('X-API-Key', 'test-api-key')
      .send({ attackType: 'password-spray', injectedField: 'evil' });
    expect(res.status).toBe(200);
    // injectedField should not appear in the response attack object
    expect(res.body.attack).not.toHaveProperty('injectedField');
  });
});

// ─── CORS ──────────────────────────────────────────────────────────────────────

describe('CORS', () => {
  it('rejects requests from disallowed origins with 403', async () => {
    const res = await request(app)
      .get('/health')
      .set('Origin', 'http://evil.com');
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/not allowed/);
  });

  it('allows requests from the configured allowed origin', async () => {
    const res = await request(app)
      .get('/health')
      .set('Origin', 'http://localhost:5173');
    expect(res.status).toBe(200);
  });

  it('allows requests with no origin (curl, server-to-server)', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
  });
});

// ─── Health endpoint ──────────────────────────────────────────────────────────

describe('GET /health', () => {
  it('returns status ok without auth', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

// ─── Webhook — GET verification handshake ─────────────────────────────────────

describe('GET /webhook', () => {
  it('responds to Okta verification challenge', async () => {
    const res = await request(app)
      .get('/webhook')
      .set('x-okta-verification-challenge', 'abc123');
    expect(res.status).toBe(200);
    expect(res.body.verification).toBe('abc123');
  });

  it('returns 400 when verification header is missing', async () => {
    const res = await request(app).get('/webhook');
    expect(res.status).toBe(400);
  });
});
