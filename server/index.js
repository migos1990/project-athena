require('dotenv').config();

// Validate environment before anything else — fail fast on missing vars
const { validateEnv } = require('./config/validateEnv');
validateEnv();

const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { WebSocketServer } = require('ws');
const http = require('http');
const { generateUseCaseNarrative } = require('./services/claudeService');
const { requireApiKey } = require('./middleware/auth');
const { validate, attackSchema } = require('./middleware/validate');
const { initDb, demos: demosRepo, events: eventsRepo, useCases: useCasesRepo, attacks: attacksRepo, audit } = require('./db');
const logger = require('./config/logger');

// Redirect all console.* calls through Pino so existing call sites emit
// structured JSON in production without requiring individual rewrites.
// Phase 6 improvement: migrate each call site to use logger directly.
console.log   = (...args) => logger.info(args.join(' '));
console.error = (...args) => logger.error(args.join(' '));
console.warn  = (...args) => logger.warn(args.join(' '));

const app = express();

// Define known use cases (cards that exist in frontend)
const KNOWN_USE_CASES = [
  'mfaLogin',
  'groupAssignment',
  'itpSessionAnomaly',      // ITP session context change
  'itpRiskElevation',       // ITP risk level change
  'itpImpossibleTravel',    // Impossible travel detection
  'itpUniversalLogout'      // Universal logout triggered
];
const PORT = process.env.PORT || 3001;

// ─── Security middleware ──────────────────────────────────────────────────────

// Helmet: sets secure HTTP response headers (CSP, HSTS, X-Frame-Options, etc.)
app.use(helmet());

// CORS: only allow explicitly configured origins
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:5173'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Postman, same-origin)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin '${origin}' not allowed`));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-API-Key']
}));

// Global rate limiter: 200 requests per 15 minutes per IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please slow down' }
});

// Strict limiter for /attack: 10 per minute per IP
const attackLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Attack rate limit exceeded (10/min)' }
});

app.use(globalLimiter);

// Capture raw body for Okta HMAC signature verification
app.use(express.json({
  limit: '100kb',
  verify: (req, _res, buf) => { req.rawBody = buf; }
}));

// Demo state
let demoStartTime = null;
let useCaseStates = {
  mfaLogin: { completed: false, data: null, generatedContent: null },
  groupAssignment: { completed: false, data: null, generatedContent: null },
  itpSessionAnomaly: { completed: false, data: null, generatedContent: null },
  itpRiskElevation: { completed: false, data: null, generatedContent: null },
  itpImpossibleTravel: { completed: false, data: null, generatedContent: null },
  itpUniversalLogout: { completed: false, data: null, generatedContent: null }
};

// Red Team attack state
let attackLog = [];
let detectionStates = {
  partiallyOffboarded: { completed: false, data: null },
  unmanagedServiceAccount: { completed: false, data: null },
  weakPasswordPolicy: { completed: false, data: null },
  ssoBypass: { completed: false, data: null }
};

// Attack-to-detection/use-case mapping (hardcoded for demo)
const ATTACK_DETECTIONS = {
  'password-spray': {
    type: 'useCase',
    targetIds: ['itpRiskElevation'],
    data: {
      affectedUser: 'john.doe@acme.com',
      userEmail: 'john.doe@acme.com',
      severity: 'HIGH',
      detectedAt: new Date().toISOString(),
      riskLevel: 'HIGH',
      riskScore: 85,
      behaviors: ['multiple_failed_logins', 'brute_force_attempt'],
      detectedAnomaly: 'Multiple failed login attempts, brute force attempt',
      details: 'Multiple failed login attempts from IP 203.0.113.42 across 15 accounts in 2 minutes - risk score elevated to HIGH'
    }
  },
  'partially-offboarded': {
    type: 'detection',
    targetIds: ['partiallyOffboarded'],
    data: {
      affectedUser: 'jane.smith@acme.com',
      severity: 'HIGH',
      detectedAt: new Date().toISOString(),
      details: 'User deactivated in Okta but retains active Salesforce and AWS sessions'
    }
  },
  'credential-leaked': {
    type: 'useCase',
    targetIds: ['itpImpossibleTravel'],
    data: {
      affectedUser: 'admin@acme.com',
      userEmail: 'admin@acme.com',
      severity: 'HIGH',
      detectedAt: new Date().toISOString(),
      riskLevel: 'HIGH',
      riskScore: 95,
      behaviors: ['impossible_travel', 'new_location', 'credential_leak_detected'],
      detectedAnomaly: 'Impossible travel, new location, credential leak detected',
      details: 'Login from Tokyo 30 minutes after login from New York - impossible travel detected'
    }
  },
  'cookie-theft': {
    type: 'detection',
    targetIds: ['ssoBypass'],
    data: {
      affectedUser: 'exec@acme.com',
      severity: 'HIGH',
      detectedAt: new Date().toISOString(),
      details: 'Direct authentication bypassing SSO - session cookie replayed from IP 198.51.100.23'
    }
  }
};

// Bidirectional MFA matching: keyed by transaction ID
// Stores whichever of session.start / auth_via_mfa arrives first
let pendingMfaEvents = new Map();

// In-memory fallback for event deduplication when DB is unavailable
// Primary deduplication now goes through eventsRepo.isDuplicate()
const processedEventUUIDs = new Set();

// Currently active demo ID (set on start/reset, used for all DB writes)
let currentDemoId = null;

// Raw webhook log for debugging — captures every request hitting /webhook (capped at 100)
const webhookLog = [];

// Track connected WebSocket clients
const clients = new Set();

// Create HTTP server
const server = http.createServer(app);

// WebSocket server
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  logger.info({ event: 'ws_connect', totalClients: clients.size + 1 }, 'WebSocket client connected');
  clients.add(ws);
  ws.isAlive = true;

  // Send current state to new client
  ws.send(JSON.stringify({
    type: 'INITIAL_STATE',
    demoStartTime,
    useCaseStates,
    detectionStates,
    attacks: attackLog
  }));

  ws.on('pong', () => {
    ws.isAlive = true;
  });

  ws.on('close', () => {
    logger.info({ event: 'ws_disconnect', totalClients: clients.size - 1 }, 'WebSocket client disconnected');
    clients.delete(ws);
  });

  ws.on('error', (err) => {
    logger.error({ event: 'ws_error', err: err.message }, 'WebSocket error');
    clients.delete(ws);
  });
});

// Heartbeat: ping clients every 30 seconds, terminate stale ones
const heartbeatInterval = setInterval(() => {
  wss.clients.forEach(ws => {
    if (!ws.isAlive) {
      console.log('Terminating stale connection');
      clients.delete(ws);
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

// Cleanup stale pending MFA events every 5 minutes
const pendingCleanupInterval = setInterval(() => {
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
  for (const [key, value] of pendingMfaEvents) {
    const eventTime = new Date(value.data?.timestamp || 0).getTime();
    if (eventTime < fiveMinutesAgo) {
      pendingMfaEvents.delete(key);
    }
  }
}, 5 * 60 * 1000);

// Broadcast to all connected clients
function broadcast(message) {
  const data = JSON.stringify(message);
  clients.forEach(client => {
    if (client.readyState === 1) { // OPEN
      client.send(data);
    }
  });
}

// In-memory metrics counters (reset on server restart)
const metrics = {
  requestsTotal: 0,
  attacksLaunched: 0,
  useCasesCompleted: 0,
  webhookEventsReceived: 0,
  claudeApiCallsTotal: 0,
  serverStartTime: Date.now()
};

// Increment request counter for all non-metrics/health requests
app.use((req, res, next) => {
  if (req.path !== '/metrics' && req.path !== '/health' && req.path !== '/ready') {
    metrics.requestsTotal++;
  }
  next();
});

// Health check — deep check (DB + WebSocket connectivity)
app.get('/health', async (req, res) => {
  const checks = { db: 'unknown', websocket: 'ok' };
  let dbOk = false;

  try {
    const { db } = require('./db');
    await db.raw('SELECT 1');
    checks.db = 'ok';
    dbOk = true;
  } catch (err) {
    checks.db = `error: ${err.message}`;
  }

  const status = dbOk ? 'ok' : 'degraded';
  res.status(dbOk ? 200 : 503).json({
    status,
    checks,
    demoStartTime,
    currentDemoId,
    websocketClients: clients.size,
    uptime_seconds: Math.floor((Date.now() - metrics.serverStartTime) / 1000)
  });
});

// Readiness probe — fails until migrations complete (used by Kubernetes)
// Once the server boots and migrations run, this always returns 200.
let isReady = false;
app.get('/ready', (req, res) => {
  if (isReady) {
    return res.status(200).json({ ready: true });
  }
  res.status(503).json({ ready: false, reason: 'Waiting for database migrations' });
});

// Metrics endpoint — Prometheus-compatible text format
app.get('/metrics', (req, res) => {
  const uptime = Math.floor((Date.now() - metrics.serverStartTime) / 1000);
  const text = [
    '# HELP athena_requests_total Total HTTP requests processed',
    '# TYPE athena_requests_total counter',
    `athena_requests_total ${metrics.requestsTotal}`,
    '',
    '# HELP athena_attacks_launched_total Red Team attacks launched',
    '# TYPE athena_attacks_launched_total counter',
    `athena_attacks_launched_total ${metrics.attacksLaunched}`,
    '',
    '# HELP athena_use_cases_completed_total Use cases completed in demos',
    '# TYPE athena_use_cases_completed_total counter',
    `athena_use_cases_completed_total ${metrics.useCasesCompleted}`,
    '',
    '# HELP athena_webhook_events_received_total Okta webhook events received',
    '# TYPE athena_webhook_events_received_total counter',
    `athena_webhook_events_received_total ${metrics.webhookEventsReceived}`,
    '',
    '# HELP athena_claude_api_calls_total Claude API calls made',
    '# TYPE athena_claude_api_calls_total counter',
    `athena_claude_api_calls_total ${metrics.claudeApiCallsTotal}`,
    '',
    '# HELP athena_websocket_clients_current Current WebSocket connections',
    '# TYPE athena_websocket_clients_current gauge',
    `athena_websocket_clients_current ${clients.size}`,
    '',
    '# HELP athena_uptime_seconds Server uptime in seconds',
    '# TYPE athena_uptime_seconds gauge',
    `athena_uptime_seconds ${uptime}`,
    ''
  ].join('\n');
  res.setHeader('Content-Type', 'text/plain; version=0.0.4');
  res.send(text);
});

// Start demo (timestamp gate)
app.post('/start-demo', requireApiKey, async (req, res) => {
  try {
    demoStartTime = new Date().toISOString();
    useCaseStates = {
      mfaLogin: { completed: false, data: null, generatedContent: null },
      groupAssignment: { completed: false, data: null, generatedContent: null },
      itpSessionAnomaly: { completed: false, data: null, generatedContent: null },
      itpRiskElevation: { completed: false, data: null, generatedContent: null },
      itpImpossibleTravel: { completed: false, data: null, generatedContent: null },
      itpUniversalLogout: { completed: false, data: null, generatedContent: null }
    };
    attackLog = [];
    detectionStates = {
      partiallyOffboarded: { completed: false, data: null },
      unmanagedServiceAccount: { completed: false, data: null },
      weakPasswordPolicy: { completed: false, data: null },
      ssoBypass: { completed: false, data: null }
    };
    pendingMfaEvents.clear();
    processedEventUUIDs.clear();

    // Persist new demo to database
    const demo = await demosRepo.createDemo({ createdBy: 'api-key' });
    await demosRepo.markStarted(demo.id);
    currentDemoId = demo.id;

    await audit.log({ actor: 'api-key', action: 'start_demo', resource: demo.id, result: 'success' });
    logger.info({ event: 'demo_started', demoId: currentDemoId, startTime: demoStartTime }, 'Demo started');

    broadcast({
      type: 'DEMO_STARTED',
      startTime: demoStartTime,
      useCaseStates,
      detectionStates,
      attacks: attackLog
    });

    res.json({ startTime: demoStartTime, demoId: currentDemoId });
  } catch (err) {
    console.error('start-demo error:', err.message);
    res.status(500).json({ error: 'Failed to start demo' });
  }
});

// Reset demo
app.post('/reset-demo', requireApiKey, async (req, res) => {
  try {
    // Mark old demo as reset in DB
    if (currentDemoId) {
      await demosRepo.markReset(currentDemoId);
    }

    demoStartTime = new Date().toISOString();
    useCaseStates = {
      mfaLogin: { completed: false, data: null, generatedContent: null },
      groupAssignment: { completed: false, data: null, generatedContent: null },
      itpSessionAnomaly: { completed: false, data: null, generatedContent: null },
      itpRiskElevation: { completed: false, data: null, generatedContent: null },
      itpImpossibleTravel: { completed: false, data: null, generatedContent: null },
      itpUniversalLogout: { completed: false, data: null, generatedContent: null }
    };
    attackLog = [];
    detectionStates = {
      partiallyOffboarded: { completed: false, data: null },
      unmanagedServiceAccount: { completed: false, data: null },
      weakPasswordPolicy: { completed: false, data: null },
      ssoBypass: { completed: false, data: null }
    };
    pendingMfaEvents.clear();
    processedEventUUIDs.clear();

    // Create a fresh demo record for the new session
    const demo = await demosRepo.createDemo({ createdBy: 'api-key' });
    await demosRepo.markStarted(demo.id);
    currentDemoId = demo.id;

    await audit.log({ actor: 'api-key', action: 'reset_demo', resource: currentDemoId, result: 'success' });
    console.log(`Demo reset at ${demoStartTime} (id: ${currentDemoId})`);

    broadcast({
      type: 'DEMO_RESET',
      startTime: demoStartTime,
      useCaseStates,
      detectionStates,
      attacks: attackLog
    });

    res.json({ startTime: demoStartTime, demoId: currentDemoId });
  } catch (err) {
    console.error('reset-demo error:', err.message);
    res.status(500).json({ error: 'Failed to reset demo' });
  }
});

// Red Team attack endpoint
app.post('/attack', requireApiKey, attackLimiter, validate(attackSchema), async (req, res) => {
  const { attackType } = req.body;

  const timestamp = new Date().toISOString();
  const attack = {
    attackType,
    timestamp,
    id: `attack-${Date.now()}`
  };

  // Add to in-memory attack log (capped at 100 entries)
  attackLog.unshift(attack);
  if (attackLog.length > 100) attackLog.pop();

  // Persist attack to database
  let dbAttackId = null;
  try {
    const mapping = ATTACK_DETECTIONS[attackType];
    dbAttackId = await attacksRepo.recordAttack({
      demoId: currentDemoId,
      attackType,
      targetUseCase: mapping?.targetIds?.[0] || null
    });
    await audit.log({ actor: 'api-key', action: 'launch_attack', resource: attackType, result: 'success', details: { attackId: dbAttackId } });
  } catch (err) {
    console.error('DB: failed to persist attack:', err.message);
    // Non-fatal — continue with in-memory operation
  }

  // Broadcast attack launched
  broadcast({
    type: 'ATTACK_LAUNCHED',
    attack
  });

  metrics.attacksLaunched++;
  logger.info({ event: 'attack_launched', attackType, attackId: attack.id }, `Red Team attack launched: ${attackType}`);

  // Trigger Blue Team detection/use case after delay (1.5-3 seconds)
  const attackMapping = ATTACK_DETECTIONS[attackType];
  if (attackMapping && attackMapping.targetIds && attackMapping.targetIds.length > 0) {
    const delay = 1500 + Math.random() * 1500; // 1.5-3 seconds

    setTimeout(async () => {
      attackMapping.targetIds.forEach(async (targetId) => {
        const enrichedData = {
          ...attackMapping.data,
          detectedAt: new Date().toISOString()
        };

        if (attackMapping.type === 'useCase') {
          // Trigger ITDR use case (pillar card)
          useCaseStates[targetId] = {
            completed: true,
            data: enrichedData,
            generatedContent: null // No Claude AI for simulated attacks
          };

          // Persist use case completion
          try {
            await useCasesRepo.recordUseCase({ demoId: currentDemoId, type: targetId, eventData: enrichedData });
            if (dbAttackId) await attacksRepo.markDetected(dbAttackId);
          } catch (err) {
            console.error('DB: failed to persist use case:', err.message);
          }

          broadcast({
            type: 'USE_CASE_COMPLETED',
            useCase: targetId,
            data: enrichedData,
            generatedContent: null
          });

          metrics.useCasesCompleted++;
          logger.info({ event: 'use_case_triggered', useCase: targetId, via: 'attack' }, `Blue Team use case triggered: ${targetId}`);
        } else {
          // Trigger ISPM detection (hub card)
          detectionStates[targetId] = {
            completed: true,
            data: enrichedData
          };

          // Persist detection
          try {
            await useCasesRepo.recordUseCase({ demoId: currentDemoId, type: `detection:${targetId}`, eventData: enrichedData });
            if (dbAttackId) await attacksRepo.markDetected(dbAttackId);
          } catch (err) {
            console.error('DB: failed to persist detection:', err.message);
          }

          broadcast({
            type: 'DETECTION_FOUND',
            detectionId: targetId,
            data: enrichedData
          });

          console.log(`🔵 Blue Team detection triggered: ${targetId}`);
        }
      });
    }, delay);
  }

  res.json({ success: true, attack });
});

// Debug: expose raw webhook log (admin only — requires API key)
app.get('/debug-log', requireApiKey, (req, res) => {
  res.json(webhookLog);
});

// ─── Okta HMAC signature validation helper ────────────────────────────────────
// Okta signs the raw request body with HMAC-SHA256 using the Event Hook secret.
// If OKTA_WEBHOOK_SECRET is configured we enforce the signature on POST requests.
function verifyOktaSignature(req) {
  const secret = process.env.OKTA_WEBHOOK_SECRET;
  if (!secret) return true; // Skip in dev when secret not configured

  const signature = req.headers['x-okta-request-signature'];
  if (!signature) return false;

  const rawBody = req.rawBody; // set by express.json verify callback (see below)
  if (!rawBody) return false;

  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('base64');

  // Timing-safe comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected)
    );
  } catch {
    return false;
  }
}

// Okta Event Hook webhook
app.all('/webhook', (req, res) => {
  // Log every hit for debugging (capped at 100)
  webhookLog.push({
    time: new Date().toISOString(),
    method: req.method,
    headers: req.headers,
    body: req.body
  });
  if (webhookLog.length > 100) webhookLog.shift();

  // GET = Verification handshake (no signature on challenge requests)
  if (req.method === 'GET') {
    const challenge = req.headers['x-okta-verification-challenge'];
    if (challenge) {
      console.log('Okta verification challenge received');
      return res.status(200).json({ verification: challenge });
    }
    return res.status(400).json({ error: 'Missing verification challenge' });
  }

  // POST = Event delivery
  if (req.method === 'POST') {
    metrics.webhookEventsReceived++;

    // Enforce HMAC signature when secret is configured
    if (!verifyOktaSignature(req)) {
      logger.warn({ event: 'webhook_signature_invalid' }, 'Webhook: invalid or missing Okta HMAC signature — rejected');
      return res.status(403).json({ error: 'Invalid webhook signature' });
    }

    // Respond immediately (Okta has 3-second timeout)
    res.status(200).send();

    // Process events asynchronously
    const events = req.body?.data?.events || [];
    processEvents(events);
  }
});

// Process Okta events (with error handling)
async function processEvents(events) {
  if (!Array.isArray(events)) {
    console.log('⚠️  Invalid payload: events is not an array');
    return;
  }

  for (const event of events) {
    try {
      if (!event || !event.eventType) {
        console.log('⚠️  Skipped malformed event (missing eventType)');
        return;
      }

      // Deduplicate by event UUID — check DB first, fall back to in-memory Set
      if (event.uuid) {
        let isDup = false;
        try {
          isDup = await eventsRepo.isDuplicate(event.uuid);
        } catch {
          // DB unavailable — fall back to in-memory check
          isDup = processedEventUUIDs.has(event.uuid);
        }
        if (isDup) {
          console.log(`  → Skipped duplicate event (uuid: ${event.uuid})`);
          return;
        }
        // Mark as processed in both stores
        try {
          await eventsRepo.recordEvent({
            demoId: currentDemoId,
            oktaUuid: event.uuid,
            eventType: event.eventType,
            eventTimestamp: event.published,
            eventData: event
          });
        } catch {
          // Fall back to in-memory deduplication
          processedEventUUIDs.add(event.uuid);
          if (processedEventUUIDs.size > 1000) {
            const first = processedEventUUIDs.values().next().value;
            processedEventUUIDs.delete(first);
          }
        }
      }

      console.log(`Event received: ${event.eventType}`);

      if (!shouldProcessEvent(event)) {
        console.log(`  → Skipped (demo not started or event before start time)`);
        return;
      }

      const eventData = {
        eventType: event.eventType,
        timestamp: event.published || new Date().toISOString(),
        userName: event.actor?.displayName || 'Unknown User',
        userEmail: event.actor?.alternateId || 'unknown@example.com',
        outcome: event.outcome?.result || 'UNKNOWN',
        transactionId: event.transaction?.id || null,
        sessionId: event.authenticationContext?.externalSessionId || null
      };

      // Extract group name from target array
      const groupTarget = event.target?.find(t => t.type === 'UserGroup');
      eventData.groupName = groupTarget?.displayName || 'Unknown Group';

      // Extract target user (for group assignment, the assigned user is in target)
      const userTarget = event.target?.find(t => t.type === 'User');
      if (userTarget) {
        eventData.targetUserName = userTarget.displayName || 'Unknown User';
        eventData.targetUserEmail = userTarget.alternateId || 'unknown@example.com';
      }

      switch (event.eventType) {
        case 'user.session.start':
          handleMfaEvent('sessionStart', eventData);
          break;
        case 'user.authentication.auth_via_mfa':
          handleMfaEvent('mfa', eventData);
          break;
        case 'group.user_membership.add':
          handleGroupAssignment(eventData);
          break;

        // ITP Events
        case 'user.session.context.change':
          handleSessionContextChange(eventData, event);
          break;
        case 'user.risk.change':
          handleRiskChange(eventData, event);
          break;
        case 'policy.auth_reevaluate.fail':
          handleUniversalLogout(eventData, event);
          break;
        case 'policy.entity_risk.evaluate':
        case 'policy.entity_risk.action':
          // Log but don't create use cases (these are follow-up events)
          console.log(`  → ITP Policy Event: ${event.eventType}`);
          break;

        default:
          console.log(`  → Ignored (unhandled event type)`);
      }
    } catch (err) {
      console.error(`⚠️  Error processing event: ${err.message}`);
    }
  }
}

// Check if event should be processed
function shouldProcessEvent(event) {
  if (!demoStartTime) return false;
  return event.published >= demoStartTime;
}

// MFA Login flow — bidirectional matching by externalSessionId
// transaction.id differs between Okta Verify push (from phone) and session.start (from browser)
// but authenticationContext.externalSessionId is shared across all events in a login flow
function handleMfaEvent(type, data) {
  const key = data.sessionId;
  if (!key) {
    console.log(`  → Skipped (no session ID to match)`);
    return;
  }

  const pending = pendingMfaEvents.get(key);

  if (pending && pending.type !== type) {
    // We have the other half — complete the use case
    const sessionData = type === 'sessionStart' ? data : pending.data;
    const mfaData = type === 'mfa' ? data : pending.data;

    const transactionData = {
      ...mfaData,
      sessionStartTime: sessionData.timestamp
    };

    // Send to Claude WITHOUT telling it which use case (Claude must identify)
    (async () => {
      try {
        const claudeResponse = await generateUseCaseNarrative({
          transactionId: key,
          events: [sessionData, mfaData],
          userEmail: sessionData.userEmail || mfaData.userEmail
        });

        console.log(`[Claude] Identified use case: ${claudeResponse.identifiedUseCase}`);

        // If Claude returns unknown, use default for MFA events
        let identifiedUseCase = claudeResponse.identifiedUseCase;
        if (!KNOWN_USE_CASES.includes(identifiedUseCase)) {
          console.log(`[Claude] Unknown use case "${identifiedUseCase}" - using default: mfaLogin`);
          identifiedUseCase = 'mfaLogin';
        }

        useCaseStates[identifiedUseCase] = {
          completed: true,
          data: transactionData,
          generatedContent: claudeResponse
        };

        broadcast({
          type: 'USE_CASE_COMPLETED',
          useCase: identifiedUseCase,
          data: transactionData,
          generatedContent: claudeResponse
        });

        console.log(`  → ${identifiedUseCase} use case COMPLETED (session: ${key})`);
      } catch (error) {
        console.error(`[Claude] Error generating narrative: ${error.message}`);
        // Fallback: broadcast without AI content
        useCaseStates.mfaLogin = {
          completed: true,
          data: transactionData
        };
        broadcast({
          type: 'USE_CASE_COMPLETED',
          useCase: 'mfaLogin',
          data: transactionData
        });
      }
    })();

    pendingMfaEvents.delete(key);
  } else {
    // Store this event and wait for the other half
    pendingMfaEvents.set(key, { type, data });
    console.log(`  → Stored pending ${type} (session: ${key})`);
  }
}

// Group Assignment flow (IGA) — single event completes the use case
function handleGroupAssignment(data) {
  console.log(`  → User ${data.targetUserEmail || data.userEmail} added to group ${data.groupName} by ${data.userName}`);

  // Send to Claude WITHOUT telling it which use case (Claude must identify)
  (async () => {
    try {
      const claudeResponse = await generateUseCaseNarrative({
        transactionId: data.transactionId || 'group-assignment',
        events: [data],
        userEmail: data.userEmail
      });

      console.log(`[Claude] Identified use case: ${claudeResponse.identifiedUseCase}`);

      // If Claude returns unknown, use default for group assignment events
      let identifiedUseCase = claudeResponse.identifiedUseCase;
      if (!KNOWN_USE_CASES.includes(identifiedUseCase)) {
        console.log(`[Claude] Unknown use case "${identifiedUseCase}" - using default: groupAssignment`);
        identifiedUseCase = 'groupAssignment';
      }

      useCaseStates[identifiedUseCase] = {
        completed: true,
        data,
        generatedContent: claudeResponse
      };

      broadcast({
        type: 'USE_CASE_COMPLETED',
        useCase: identifiedUseCase,
        data,
        generatedContent: claudeResponse
      });

      console.log(`  → ${identifiedUseCase} use case COMPLETED`);
    } catch (error) {
      console.error(`[Claude] Error generating narrative: ${error.message}`);
      // Fallback: broadcast without AI content
      useCaseStates.groupAssignment = {
        completed: true,
        data
      };
      broadcast({
        type: 'USE_CASE_COMPLETED',
        useCase: 'groupAssignment',
        data
      });
    }
  })();
}

// ITP Session Context Change — single event completes the use case
function handleSessionContextChange(data, fullEvent) {
  // Extract ITP-specific data from debugContext
  const risk = fullEvent?.debugContext?.debugData?.risk || {};
  const behaviorsRaw = fullEvent?.debugContext?.debugData?.behaviors || [];

  // Ensure behaviors is always an array
  const behaviors = Array.isArray(behaviorsRaw) ? behaviorsRaw : [];

  const enrichedData = {
    ...data,
    riskLevel: risk.level || 'UNKNOWN',
    riskScore: risk.score || 0,
    behaviors: behaviors,
    detectedAnomaly: behaviors.length > 0 ? behaviors.join(', ') : 'Session context changed',
    displayMessage: fullEvent?.displayMessage || 'Session context changed'
  };

  console.log(`  → ITP Session Context Change for ${data.userEmail}: ${enrichedData.detectedAnomaly}`);

  // Send to Claude for narrative generation
  (async () => {
    try {
      const claudeResponse = await generateUseCaseNarrative({
        transactionId: data.transactionId || `itp-session-${Date.now()}`,
        events: [enrichedData],
        userEmail: data.userEmail,
        eventType: 'user.session.context.change'
      });

      console.log(`[Claude] Identified use case: ${claudeResponse.identifiedUseCase}`);

      // If Claude returns unknown, use default for this event type
      let identifiedUseCase = claudeResponse.identifiedUseCase;
      if (!KNOWN_USE_CASES.includes(identifiedUseCase)) {
        console.log(`[Claude] Unknown use case "${identifiedUseCase}" - using default: itpSessionAnomaly`);
        identifiedUseCase = 'itpSessionAnomaly';
      }

      useCaseStates[identifiedUseCase] = {
        completed: true,
        data: enrichedData,
        generatedContent: claudeResponse
      };

      broadcast({
        type: 'USE_CASE_COMPLETED',
        useCase: identifiedUseCase,
        data: enrichedData,
        generatedContent: claudeResponse
      });

      console.log(`  → ${identifiedUseCase} use case COMPLETED`);
    } catch (error) {
      console.error(`[Claude] Error generating narrative: ${error.message}`);
      // Fallback: broadcast without AI content
      useCaseStates.itpSessionAnomaly = {
        completed: true,
        data: enrichedData
      };
      broadcast({
        type: 'USE_CASE_COMPLETED',
        useCase: 'itpSessionAnomaly',
        data: enrichedData
      });
    }
  })();
}

// ITP Risk Level Change — single event completes the use case
function handleRiskChange(data, fullEvent) {
  const risk = fullEvent?.debugContext?.debugData?.risk || {};
  const behaviorsRaw = fullEvent?.debugContext?.debugData?.behaviors || [];

  // Ensure behaviors is always an array
  const behaviors = Array.isArray(behaviorsRaw) ? behaviorsRaw : [];

  const enrichedData = {
    ...data,
    oldRiskLevel: risk.previousLevel || 'UNKNOWN',
    newRiskLevel: risk.level || 'UNKNOWN',
    riskScore: risk.score || 0,
    behaviors: behaviors,
    detectedAnomaly: behaviors.length > 0 ? behaviors.join(', ') : 'Risk level changed',
    displayMessage: fullEvent?.displayMessage || 'User risk level changed'
  };

  console.log(`  → ITP Risk Change for ${data.userEmail}: ${enrichedData.oldRiskLevel} → ${enrichedData.newRiskLevel}`);

  // Send to Claude for narrative generation
  (async () => {
    try {
      const claudeResponse = await generateUseCaseNarrative({
        transactionId: data.transactionId || `itp-risk-${Date.now()}`,
        events: [enrichedData],
        userEmail: data.userEmail,
        eventType: 'user.risk.change'
      });

      console.log(`[Claude] Identified use case: ${claudeResponse.identifiedUseCase}`);

      // If Claude returns unknown, use default for this event type
      let identifiedUseCase = claudeResponse.identifiedUseCase;
      if (!KNOWN_USE_CASES.includes(identifiedUseCase)) {
        console.log(`[Claude] Unknown use case "${identifiedUseCase}" - using default: itpRiskElevation`);
        identifiedUseCase = 'itpRiskElevation';
      }

      useCaseStates[identifiedUseCase] = {
        completed: true,
        data: enrichedData,
        generatedContent: claudeResponse
      };

      broadcast({
        type: 'USE_CASE_COMPLETED',
        useCase: identifiedUseCase,
        data: enrichedData,
        generatedContent: claudeResponse
      });

      console.log(`  → ${identifiedUseCase} use case COMPLETED`);
    } catch (error) {
      console.error(`[Claude] Error generating narrative: ${error.message}`);
      // Fallback
      useCaseStates.itpRiskElevation = {
        completed: true,
        data: enrichedData
      };
      broadcast({
        type: 'USE_CASE_COMPLETED',
        useCase: 'itpRiskElevation',
        data: enrichedData
      });
    }
  })();
}

// ITP Universal Logout — policy reevaluation failed, session terminated
function handleUniversalLogout(data, fullEvent) {
  // Extract risk and behaviors from debugContext (these are strings, not objects)
  const debugData = fullEvent?.debugContext?.debugData || {};
  const riskString = debugData.risk || '';
  const behaviorsString = debugData.behaviors || '';

  // Parse risk level from string like "level=HIGH, reasons=..."
  const riskMatch = riskString.match(/level=(\w+)/);
  const riskLevel = riskMatch ? riskMatch[1] : 'UNKNOWN';

  // Parse reasons from risk string
  const reasonsMatch = riskString.match(/reasons=(.+)/);
  const reasons = reasonsMatch ? reasonsMatch[1] : 'Unknown reasons';

  // Parse behaviors from string like "{New IP=POSITIVE, New Country=POSITIVE, ...}"
  const behaviorMatches = behaviorsString.match(/(\w+[\s\w-]+)=(POSITIVE|NEGATIVE)/g) || [];
  const behaviors = behaviorMatches
    .filter(b => b.includes('POSITIVE'))
    .map(b => b.split('=')[0].trim());

  const enrichedData = {
    ...data,
    riskLevel,
    reasons,
    behaviors,
    outcome: fullEvent?.outcome?.result || 'UNKNOWN',
    outcomeReason: fullEvent?.outcome?.reason || '',
    detectedAnomaly: reasons,
    displayMessage: fullEvent?.displayMessage || 'Universal logout triggered'
  };

  console.log(`  → ITP Universal Logout for ${data.userEmail}: ${riskLevel} risk - ${reasons}`);

  // Send to Claude for narrative generation
  (async () => {
    try {
      const claudeResponse = await generateUseCaseNarrative({
        transactionId: data.transactionId || `itp-logout-${Date.now()}`,
        events: [enrichedData],
        userEmail: data.userEmail,
        eventType: 'policy.auth_reevaluate.fail'
      });

      console.log(`[Claude] Identified use case: ${claudeResponse.identifiedUseCase}`);

      // If Claude returns unknown, use default for this event type
      let identifiedUseCase = claudeResponse.identifiedUseCase;
      if (!KNOWN_USE_CASES.includes(identifiedUseCase)) {
        console.log(`[Claude] Unknown use case "${identifiedUseCase}" - using default: itpUniversalLogout`);
        identifiedUseCase = 'itpUniversalLogout';
      }

      useCaseStates[identifiedUseCase] = {
        completed: true,
        data: enrichedData,
        generatedContent: claudeResponse
      };

      broadcast({
        type: 'USE_CASE_COMPLETED',
        useCase: identifiedUseCase,
        data: enrichedData,
        generatedContent: claudeResponse
      });

      console.log(`  → ${identifiedUseCase} use case COMPLETED`);
    } catch (error) {
      console.error(`[Claude] Error generating narrative: ${error.message}`);
      // Fallback
      useCaseStates.itpUniversalLogout = {
        completed: true,
        data: enrichedData
      };
      broadcast({
        type: 'USE_CASE_COMPLETED',
        useCase: 'itpUniversalLogout',
        data: enrichedData
      });
    }
  })();
}

// Global error handler — catches CORS errors and other unhandled middleware errors
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.message && err.message.startsWith('CORS:')) {
    return res.status(403).json({ error: err.message });
  }
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server — run DB migrations first, then open port
(async () => {
  try {
    await initDb();
    isReady = true; // Signal readiness probe: migrations complete
  } catch (err) {
    logger.error({ event: 'startup_failed', err: err.message }, 'Failed to initialise database — exiting');
    process.exit(1);
  }

  server.listen(PORT, () => {
    logger.info({
      event: 'server_started',
      port: PORT,
      allowedOrigins,
      hmacEnabled: Boolean(process.env.OKTA_WEBHOOK_SECRET),
      nodeEnv: process.env.NODE_ENV || 'development'
    }, `Project Athena server running on port ${PORT}`);
  });
})();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down...');
  clearInterval(heartbeatInterval);
  clearInterval(pendingCleanupInterval);
  wss.close();
  server.close();
});

// Export for testing — supertest binds its own ephemeral port
module.exports = { app, server };
