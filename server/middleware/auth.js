/**
 * API Key authentication middleware.
 *
 * Reads DEMO_API_KEY from the environment. If not set the server will refuse
 * to start (enforced by config/validateEnv). Clients must send the key in
 * the X-API-Key request header.
 *
 * This is the Phase 1 implementation. Phase 2 will upgrade to Okta OAuth 2.0 / OIDC
 * with short-lived JWTs, refresh-token rotation, and role-based access control.
 */

const API_KEY = process.env.DEMO_API_KEY;

/**
 * Middleware: require a valid API key.
 * Returns 401 when header is missing, 403 when the key is wrong.
 */
function requireApiKey(req, res, next) {
  const provided = req.headers['x-api-key'];

  if (!provided) {
    return res.status(401).json({
      error: 'Missing X-API-Key header',
      hint: 'All mutating endpoints require authentication'
    });
  }

  if (provided !== API_KEY) {
    return res.status(403).json({ error: 'Invalid API key' });
  }

  next();
}

module.exports = { requireApiKey };
