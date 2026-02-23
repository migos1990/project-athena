/**
 * Unit tests for the API key authentication middleware.
 */

describe('requireApiKey middleware', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    process.env = { ...OLD_ENV, DEMO_API_KEY: 'secret-key-123' };
    jest.resetModules();
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  function getMiddleware() {
    return require('../middleware/auth').requireApiKey;
  }

  function mockReqRes(headers = {}) {
    const req = { headers };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    const next = jest.fn();
    return { req, res, next };
  }

  it('calls next() when the correct API key is provided', () => {
    const requireApiKey = getMiddleware();
    const { req, res, next } = mockReqRes({ 'x-api-key': 'secret-key-123' });
    requireApiKey(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 401 when X-API-Key header is absent', () => {
    const requireApiKey = getMiddleware();
    const { req, res, next } = mockReqRes({});
    requireApiKey(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringMatching(/Missing/) })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 when an incorrect API key is provided', () => {
    const requireApiKey = getMiddleware();
    const { req, res, next } = mockReqRes({ 'x-api-key': 'wrong-key' });
    requireApiKey(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});
