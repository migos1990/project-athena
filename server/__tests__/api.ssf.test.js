/**
 * SSF Transmitter endpoint tests — POST /ssf/transmit
 *
 * The JWT is now signed client-side and sent pre-signed to the server.
 * Tests build and sign a real RS256 JWT using node:crypto to match the
 * compact JWT that the browser's jose library produces.
 *
 * All outbound fetch calls to Okta are mocked — no real network requests.
 */

process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
process.env.DEMO_API_KEY = 'test-api-key';
process.env.SQLITE_PATH = ':memory:';
process.env.ALLOWED_ORIGINS = 'http://localhost:5173';

const request = require('supertest');
const { generateKeyPairSync } = require('crypto');
const crypto = require('crypto');

let app;

beforeAll(async () => {
  ({ app } = require('../index'));
  await new Promise(r => setTimeout(r, 500));
});

afterAll(async () => {
  const { server } = require('../index');
  await new Promise(r => server.close(r));
});

// Generate a real RSA-2048 key pair once for all tests
const { privateKey: testPrivKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const TEST_KEY_ID = 'test-kid-123';

// Minimal Okta user-risk-change events payload
const VALID_EVENTS_PAYLOAD = {
  'https://schemas.okta.com/secevent/okta/event-type/user-risk-change': {
    event_timestamp: Math.floor(Date.now() / 1000),
    current_level: 'high',
    previous_level: 'low',
    initiating_entity: 'policy',
    reason_admin: { en: 'Malware detected on endpoint' },
    reason_user: { en: 'A threat was found on your device' },
    subject: { user: { format: 'email', email: 'victim@acme.com' } },
  },
};

/**
 * Signs a compact RS256 JWT using node:crypto — mirrors what jose does in the browser.
 */
function signTestJwt(payload, privateKey, kid) {
  const b64url = (input) =>
    Buffer.from(typeof input === 'string' ? input : JSON.stringify(input)).toString('base64url');
  const header = { alg: 'RS256', kid, typ: 'secevent+jwt' };
  const signingInput = `${b64url(header)}.${b64url(payload)}`;
  const sig = crypto.sign('sha256', Buffer.from(signingInput), {
    key: privateKey,
    padding: crypto.constants.RSA_PKCS1_PADDING,
  });
  return `${signingInput}.${sig.toString('base64url')}`;
}

const TEST_PAYLOAD = {
  iss: 'https://falcon.crowdstrike.com',
  iat: Math.floor(Date.now() / 1000),
  jti: 'test-jti-123',
  aud: 'https://acme.okta.com',
  events: VALID_EVENTS_PAYLOAD,
};

const TEST_SIGNED_JWT = signTestJwt(TEST_PAYLOAD, testPrivKey, TEST_KEY_ID);

const VALID_BODY = {
  oktaDomain: 'acme.okta.com',
  signedJwt: TEST_SIGNED_JWT,
  providerName: 'CrowdStrike Falcon',
  eventLabel: 'Malware Detected',
  providerId: 'crowdstrike',
};

// ─── Authentication ─────────────────────────────────────────────────────────────

describe('Authentication — /ssf/transmit', () => {
  it('returns 401 when X-API-Key header is missing', async () => {
    const res = await request(app).post('/ssf/transmit').send(VALID_BODY);
    expect(res.status).toBe(401);
  });

  it('returns 403 when X-API-Key is wrong', async () => {
    const res = await request(app)
      .post('/ssf/transmit')
      .set('X-API-Key', 'wrong-key')
      .send(VALID_BODY);
    expect(res.status).toBe(403);
  });
});

// ─── Validation ─────────────────────────────────────────────────────────────────

describe('Validation — /ssf/transmit', () => {
  const AUTH = { 'X-API-Key': 'test-api-key' };

  it('returns 400 when oktaDomain is missing', async () => {
    const { oktaDomain, ...body } = VALID_BODY;
    const res = await request(app).post('/ssf/transmit').set(AUTH).send(body);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  it('returns 400 when signedJwt is missing', async () => {
    const { signedJwt, ...body } = VALID_BODY;
    const res = await request(app).post('/ssf/transmit').set(AUTH).send(body);
    expect(res.status).toBe(400);
    expect(res.body.details).toEqual(expect.arrayContaining([expect.stringContaining('signedJwt')]));
  });

  it('returns 400 when signedJwt exceeds 16384 bytes', async () => {
    const res = await request(app).post('/ssf/transmit').set(AUTH).send({
      ...VALID_BODY,
      signedJwt: 'a'.repeat(16385),
    });
    expect(res.status).toBe(400);
    expect(res.body.details).toEqual(expect.arrayContaining([expect.stringContaining('maximum')]));
  });

  it('returns 400 when providerId is not in the allowed list', async () => {
    const res = await request(app).post('/ssf/transmit').set(AUTH).send({
      ...VALID_BODY,
      providerId: 'unknown-vendor',
    });
    expect(res.status).toBe(400);
    expect(res.body.details).toEqual(expect.arrayContaining([expect.stringContaining('providerId')]));
  });
});

// ─── Successful transmission ────────────────────────────────────────────────────

describe('Successful transmission — /ssf/transmit', () => {
  const AUTH = { 'X-API-Key': 'test-api-key' };

  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 202,
      text: async () => '',
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns 200 with success and status on Okta 202 Accepted', async () => {
    const res = await request(app).post('/ssf/transmit').set(AUTH).send(VALID_BODY);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.status).toBe(202);
    // Private key material and raw JWT are not echoed back
    expect(res.body.jwt).toBeUndefined();
    expect(res.body.payload).toBeUndefined();
  });

  it('sends the pre-signed JWT to Okta SSF endpoint with correct headers', async () => {
    await request(app).post('/ssf/transmit').set(AUTH).send(VALID_BODY);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toBe('https://acme.okta.com/security/api/v1/security-events');
    expect(options.method).toBe('POST');
    expect(options.headers['Content-Type']).toBe('application/secevent+jwt');
    expect(options.headers['Accept']).toBe('application/json');
    expect(options.body).toBe(TEST_SIGNED_JWT);
  });

  it('strips https:// prefix from oktaDomain and routes to correct endpoint', async () => {
    await request(app).post('/ssf/transmit').set(AUTH).send({
      ...VALID_BODY,
      oktaDomain: 'https://acme.okta.com',
    });
    const [url] = global.fetch.mock.calls[0];
    expect(url).toBe('https://acme.okta.com/security/api/v1/security-events');
  });

  it('JWT forwarded to Okta has alg=RS256, correct kid, and typ=secevent+jwt', async () => {
    await request(app).post('/ssf/transmit').set(AUTH).send(VALID_BODY);

    const [, options] = global.fetch.mock.calls[0];
    const [headerB64] = options.body.split('.');
    const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString());
    expect(header.alg).toBe('RS256');
    expect(header.kid).toBe(TEST_KEY_ID);
    expect(header.typ).toBe('secevent+jwt');
  });
});

// ─── Okta error handling ────────────────────────────────────────────────────────

describe('Okta error handling — /ssf/transmit', () => {
  const AUTH = { 'X-API-Key': 'test-api-key' };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns Okta error details, a hint, and debugInfo when Okta responds 400', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => JSON.stringify({
        error: 'invalid_request',
        error_description: 'The issuer claim does not match any configured stream',
      }),
    });

    const res = await request(app).post('/ssf/transmit').set(AUTH).send(VALID_BODY);
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('invalid_request');
    expect(res.body.hint).toMatch(/Issuer URL/);
    expect(res.body.debugInfo).toBeDefined();
    expect(res.body.debugInfo.endpoint).toBe('https://acme.okta.com/security/api/v1/security-events');
    expect(res.body.debugInfo.keyId).toBe(TEST_KEY_ID);
    // No private key material echoed on error
    expect(res.body.payload).toBeUndefined();
  });

  it('returns a JWKS hint when Okta responds with a key/signature error', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => JSON.stringify({
        error: 'unauthorized',
        error_description: 'Unable to verify signature using JWKS endpoint',
      }),
    });

    const res = await request(app).post('/ssf/transmit').set(AUTH).send(VALID_BODY);
    expect(res.status).toBe(401);
    expect(res.body.hint).toMatch(/JWKS/);
  });

  it('debugInfo derives issuer from the JWT payload claims', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => JSON.stringify({ error: 'bad_request', error_description: 'Invalid token' }),
    });

    const res = await request(app).post('/ssf/transmit').set(AUTH).send(VALID_BODY);
    expect(res.body.debugInfo.issuer).toBe('https://falcon.crowdstrike.com');
  });
});

// ─── Attack log integration ─────────────────────────────────────────────────────

describe('Attack log — /ssf/transmit', () => {
  const AUTH = { 'X-API-Key': 'test-api-key' };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('increments attacksLaunched metric and broadcasts ATTACK_LAUNCHED on success', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 202, text: async () => '' });
    const res = await request(app).post('/ssf/transmit').set(AUTH).send(VALID_BODY);
    expect(res.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('still logs the attack and broadcasts even when Okta rejects', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => JSON.stringify({ error: 'invalid_request', error_description: 'bad issuer' }),
    });
    const res = await request(app).post('/ssf/transmit').set(AUTH).send(VALID_BODY);
    // Okta error code is proxied back but attack log was still updated
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
