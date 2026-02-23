/**
 * Unit tests for the Joi validation middleware.
 */

const { validate, attackSchema } = require('../middleware/validate');

function mockReqRes(body) {
  const req = { body };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn()
  };
  const next = jest.fn();
  return { req, res, next };
}

describe('validate middleware', () => {
  it('calls next() when body is valid', () => {
    const { req, res, next } = mockReqRes({ attackType: 'password-spray' });
    validate(attackSchema)(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('strips unknown fields from the body', () => {
    const { req, res, next } = mockReqRes({ attackType: 'password-spray', extra: 'bad' });
    validate(attackSchema)(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.body).toEqual({ attackType: 'password-spray' });
    expect(req.body).not.toHaveProperty('extra');
  });

  it('returns 400 when attackType is missing', () => {
    const { req, res, next } = mockReqRes({});
    validate(attackSchema)(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Validation failed', details: expect.any(Array) })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 400 for an invalid attack type', () => {
    const { req, res, next } = mockReqRes({ attackType: 'not-a-real-attack' });
    validate(attackSchema)(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it.each([
    'password-spray',
    'partially-offboarded',
    'credential-leaked',
    'cookie-theft'
  ])('accepts valid attack type: %s', (attackType) => {
    const { req, res, next } = mockReqRes({ attackType });
    validate(attackSchema)(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });
});
