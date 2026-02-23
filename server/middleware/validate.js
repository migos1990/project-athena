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

module.exports = { validate, attackSchema };
