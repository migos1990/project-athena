/**
 * Startup environment configuration validator.
 *
 * Calls process.exit(1) with a clear message if any required variable is absent.
 * This prevents the server from running in an insecure or broken state.
 */

const REQUIRED = [
  { key: 'ANTHROPIC_API_KEY', hint: 'Get yours at https://console.anthropic.com' },
  { key: 'DEMO_API_KEY',      hint: 'Generate with: openssl rand -hex 32' }
];

const OPTIONAL_WITH_DEFAULTS = [
  { key: 'PORT',                      default: '3001' },
  { key: 'ALLOWED_ORIGINS',           default: 'http://localhost:5173' },
  { key: 'MAX_CLAUDE_CALLS_PER_HOUR', default: '100' },
  { key: 'MAX_COST_PER_HOUR',         default: '1.00' },
  { key: 'OKTA_WEBHOOK_SECRET',       default: '' }  // empty = HMAC validation skipped
];

function validateEnv() {
  const missing = REQUIRED.filter(({ key }) => !process.env[key]);

  if (missing.length > 0) {
    console.error('\n❌  Server refused to start — missing required environment variables:\n');
    missing.forEach(({ key, hint }) => {
      console.error(`   ${key}  →  ${hint}`);
    });
    console.error('\nCopy .env.example to .env and fill in the values.\n');
    process.exit(1);
  }

  // Apply defaults for optional vars
  OPTIONAL_WITH_DEFAULTS.forEach(({ key, default: def }) => {
    if (!process.env[key]) {
      process.env[key] = def;
    }
  });

  console.log('✅  Environment config validated');
}

module.exports = { validateEnv };
