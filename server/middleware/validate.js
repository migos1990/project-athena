/**
 * Joi-based request body validation middleware factory.
 *
 * Usage:
 *   const { validate } = require('./middleware/validate');
 *   app.post('/attack', validate(attackSchema), handler);
 */

const Joi = require('joi');

const VALID_ATTACK_TYPES = [
  'password-spray',
  'partially-offboarded',
  'credential-leaked',
  'cookie-theft'
];

const VALID_PROVIDER_IDS = ['crowdstrike', 'zscaler', 'paloalto', 'custom'];

// Schema for POST /attack
const attackSchema = Joi.object({
  attackType: Joi.string()
    .valid(...VALID_ATTACK_TYPES)
    .required()
    .messages({
      'any.only': `attackType must be one of: ${VALID_ATTACK_TYPES.join(', ')}`,
      'any.required': 'attackType is required'
    })
});

/**
 * Returns an Express middleware that validates req.body against the given Joi schema.
 * Responds 400 with validation details on failure.
 */
function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(d => d.message)
      });
    }
    req.body = value; // replace with sanitised value
    next();
  };
}

// Schema for POST /ssf/transmit
// The JWT is now signed client-side; this endpoint only receives the pre-signed JWT
// and forwards it to Okta. Private key material never transits the server.
const ssfTransmitSchema = Joi.object({
  oktaDomain: Joi.string().trim().required()
    .messages({ 'any.required': 'oktaDomain is required' }),
  signedJwt: Joi.string().max(16384).required()
    .messages({
      'any.required': 'signedJwt is required',
      'string.max': 'signedJwt exceeds maximum allowed size'
    }),
  providerName: Joi.string().required()
    .messages({ 'any.required': 'providerName is required' }),
  eventLabel: Joi.string().required()
    .messages({ 'any.required': 'eventLabel is required' }),
  providerId: Joi.string().valid(...VALID_PROVIDER_IDS).required()
    .messages({
      'any.only': `providerId must be one of: ${VALID_PROVIDER_IDS.join(', ')}`,
      'any.required': 'providerId is required'
    }),
});

module.exports = { validate, attackSchema, ssfTransmitSchema };
