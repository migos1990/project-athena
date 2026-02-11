require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { WebSocketServer } = require('ws');
const http = require('http');
const { generateUseCaseNarrative } = require('./services/claudeService');

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

// Middleware
app.use(cors());
app.use(express.json());

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

// Deduplicate Okta events by UUID (Okta may retry delivery)
const processedEventUUIDs = new Set();

// Raw webhook log for debugging — captures every request hitting /webhook (capped at 100)
const webhookLog = [];

// Track connected WebSocket clients
const clients = new Set();

// Create HTTP server
const server = http.createServer(app);

// WebSocket server
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  console.log('Client connected');
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
    console.log('Client disconnected');
    clients.delete(ws);
  });

  ws.on('error', (err) => {
    console.error('WebSocket error:', err.message);
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

// Broadcast to all connected clients
function broadcast(message) {
  const data = JSON.stringify(message);
  clients.forEach(client => {
    if (client.readyState === 1) { // OPEN
      client.send(data);
    }
  });
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', demoStartTime, useCaseStates });
});

// Start demo (timestamp gate)
app.post('/start-demo', (req, res) => {
  demoStartTime = new Date().toISOString();
  useCaseStates = {
    mfaLogin: { completed: false, data: null, generatedContent: null },
    groupAssignment: { completed: false, data: null, generatedContent: null }
  };
  pendingMfaEvents.clear();
  processedEventUUIDs.clear();

  console.log(`Demo started at ${demoStartTime}`);

  broadcast({
    type: 'DEMO_STARTED',
    startTime: demoStartTime,
    useCaseStates
  });

  res.json({ startTime: demoStartTime });
});

// Reset demo
app.post('/reset-demo', (req, res) => {
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

  console.log(`Demo reset at ${demoStartTime}`);

  broadcast({
    type: 'DEMO_RESET',
    startTime: demoStartTime,
    useCaseStates,
    detectionStates,
    attacks: attackLog
  });

  res.json({ startTime: demoStartTime });
});

// Red Team attack endpoint
app.post('/attack', (req, res) => {
  const { attackType } = req.body;

  if (!attackType) {
    return res.status(400).json({ error: 'attackType is required' });
  }

  const timestamp = new Date().toISOString();
  const attack = {
    attackType,
    timestamp,
    id: `attack-${Date.now()}`
  };

  // Add to attack log
  attackLog.unshift(attack);

  // Broadcast attack launched
  broadcast({
    type: 'ATTACK_LAUNCHED',
    attack
  });

  console.log(`🔴 Red Team attack launched: ${attackType}`);

  // Trigger Blue Team detection/use case after delay (1.5-3 seconds)
  const attackMapping = ATTACK_DETECTIONS[attackType];
  if (attackMapping && attackMapping.targetIds && attackMapping.targetIds.length > 0) {
    const delay = 1500 + Math.random() * 1500; // 1.5-3 seconds

    setTimeout(() => {
      attackMapping.targetIds.forEach(targetId => {
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

          broadcast({
            type: 'USE_CASE_COMPLETED',
            useCase: targetId,
            data: enrichedData,
            generatedContent: null
          });

          console.log(`🔵 Blue Team use case triggered: ${targetId}`);
        } else {
          // Trigger ISPM detection (hub card)
          detectionStates[targetId] = {
            completed: true,
            data: enrichedData
          };

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

// Debug: expose raw webhook log
app.get('/debug-log', (req, res) => {
  res.json(webhookLog);
});

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

  // GET = Verification handshake
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
    // Respond immediately (Okta has 3-second timeout)
    res.status(200).send();

    // Process events asynchronously
    const events = req.body?.data?.events || [];
    processEvents(events);
  }
});

// Process Okta events (with error handling)
function processEvents(events) {
  if (!Array.isArray(events)) {
    console.log('⚠️  Invalid payload: events is not an array');
    return;
  }

  events.forEach(event => {
    try {
      if (!event || !event.eventType) {
        console.log('⚠️  Skipped malformed event (missing eventType)');
        return;
      }

      // Deduplicate by event UUID
      if (event.uuid && processedEventUUIDs.has(event.uuid)) {
        console.log(`  → Skipped duplicate event (uuid: ${event.uuid})`);
        return;
      }
      if (event.uuid) processedEventUUIDs.add(event.uuid);

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
  });
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

// Start server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket available at ws://localhost:${PORT}`);
  console.log(`Webhook endpoint: http://localhost:${PORT}/webhook`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down...');
  clearInterval(heartbeatInterval);
  wss.close();
  server.close();
});
