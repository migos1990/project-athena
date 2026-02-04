const express = require('express');
const cors = require('cors');
const { WebSocketServer } = require('ws');
const http = require('http');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Demo state
let demoStartTime = null;
let useCaseStates = {
  mfaLogin: { completed: false, data: null },
  accessRequest: { completed: false, data: null, steps: [] }
};

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
    useCaseStates
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
  res.json({ status: 'ok', demoStartTime });
});

// Start demo (timestamp gate)
app.post('/start-demo', (req, res) => {
  demoStartTime = new Date().toISOString();
  useCaseStates = {
    mfaLogin: { completed: false, data: null },
    accessRequest: { completed: false, data: null, steps: [] }
  };

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
    mfaLogin: { completed: false, data: null },
    accessRequest: { completed: false, data: null, steps: [] }
  };

  console.log(`Demo reset at ${demoStartTime}`);

  broadcast({
    type: 'DEMO_RESET',
    startTime: demoStartTime,
    useCaseStates
  });

  res.json({ startTime: demoStartTime });
});

// Okta Event Hook webhook
app.all('/webhook', (req, res) => {
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
  // Guard: ensure events is an array
  if (!Array.isArray(events)) {
    console.log('⚠️  Invalid payload: events is not an array');
    return;
  }

  events.forEach(event => {
    try {
      // Guard: skip if event is null/undefined or missing eventType
      if (!event || !event.eventType) {
        console.log('⚠️  Skipped malformed event (missing eventType)');
        return;
      }

      console.log(`Event received: ${event.eventType}`);

      // Check if demo is active and event is after start time
      if (!shouldProcessEvent(event)) {
        console.log(`  → Skipped (demo not started or event before start time)`);
        return;
      }

      // Extract common data (lenient: use fallbacks for missing fields)
      const eventData = {
        eventType: event.eventType,
        timestamp: event.published || new Date().toISOString(),
        userName: event.actor?.displayName || 'Unknown User',
        userEmail: event.actor?.alternateId || 'unknown@example.com',
        outcome: event.outcome?.result || 'UNKNOWN',
        transactionId: event.transaction?.id || null
      };

      // Get app name for provisioning events
      const appTarget = event.target?.find(t => t.type === 'AppInstance');
      eventData.appName = appTarget?.displayName || 'Unknown App';

      // Map event to use case
      switch (event.eventType) {
        case 'user.session.start':
          handleSessionStart(eventData);
          break;
        case 'user.authentication.auth_via_mfa':
          handleMfaComplete(eventData);
          break;
        case 'access.request.create':
          handleAccessRequestCreate(eventData);
          break;
        case 'access.request.action':
          if (eventData.outcome === 'SUCCESS') {
            handleAccessRequestApprove(eventData);
          }
          break;
        case 'application.user_membership.add':
          handleUserProvisioned(eventData);
          break;
        default:
          console.log(`  → Ignored (unhandled event type)`);
      }
    } catch (err) {
      // Catch any unexpected errors to prevent crash
      console.error(`⚠️  Error processing event: ${err.message}`);
    }
  });
}

// Check if event should be processed
function shouldProcessEvent(event) {
  if (!demoStartTime) return false;
  return event.published >= demoStartTime;
}

// MFA Login flow
let pendingMfaLogin = null;

function handleSessionStart(data) {
  console.log(`  → Session started for ${data.userEmail}`);
  pendingMfaLogin = {
    transactionId: data.transactionId,
    ...data
  };
}

function handleMfaComplete(data) {
  console.log(`  → MFA completed for ${data.userEmail}`);

  // Guard: need transaction ID to match
  if (!data.transactionId) {
    console.log(`  → Skipped (no transaction ID to match)`);
    return;
  }

  // Check if we have a matching session start
  if (pendingMfaLogin && pendingMfaLogin.transactionId === data.transactionId) {
    useCaseStates.mfaLogin = {
      completed: true,
      data: {
        ...data,
        sessionStartTime: pendingMfaLogin.timestamp
      }
    };

    broadcast({
      type: 'USE_CASE_COMPLETED',
      useCase: 'mfaLogin',
      data: useCaseStates.mfaLogin.data
    });

    pendingMfaLogin = null;
    console.log(`  → MFA Login use case COMPLETED`);
  } else {
    console.log(`  → No matching session start (txn: ${data.transactionId})`);
  }
}

// Access Request flow
function handleAccessRequestCreate(data) {
  console.log(`  → Access request created by ${data.userEmail}`);
  useCaseStates.accessRequest.steps.push({
    step: 'requested',
    ...data
  });

  broadcast({
    type: 'USE_CASE_PROGRESS',
    useCase: 'accessRequest',
    step: 'requested',
    data
  });
}

function handleAccessRequestApprove(data) {
  console.log(`  → Access request approved for ${data.userEmail}`);
  useCaseStates.accessRequest.steps.push({
    step: 'approved',
    ...data
  });

  broadcast({
    type: 'USE_CASE_PROGRESS',
    useCase: 'accessRequest',
    step: 'approved',
    data
  });
}

function handleUserProvisioned(data) {
  console.log(`  → User ${data.userEmail} provisioned to ${data.appName}`);

  // Mark use case as completed
  useCaseStates.accessRequest.completed = true;
  useCaseStates.accessRequest.data = data;

  broadcast({
    type: 'USE_CASE_COMPLETED',
    useCase: 'accessRequest',
    data
  });

  console.log(`  → Access Request use case COMPLETED`);
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
