const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

// In-memory cache: prevents duplicate API calls for same transaction
const narrativeCache = new Map(); // Key: transactionId, Value: { narrative, businessOutcomes, cachedAt }
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

// Cleanup expired cache entries every 30 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of narrativeCache) {
    if (now - value.cachedAt > CACHE_TTL) {
      narrativeCache.delete(key);
    }
  }
}, 30 * 60 * 1000);

// Usage tracking (safety limits)
const usageStats = {
  totalCalls: 0,
  totalTokensUsed: 0,
  totalCostUSD: 0,
  callsThisHour: 0,
  costThisHour: 0,
  hourStartTime: Date.now()
};

// Pricing for Claude Haiku 4.5 (as of Feb 2026)
const HAIKU_PRICING = {
  inputTokensPerMillion: 0.80,   // $0.80 per 1M input tokens
  outputTokensPerMillion: 4.00    // $4.00 per 1M output tokens
};

function resetHourlyStats() {
  const now = Date.now();
  if (now - usageStats.hourStartTime > 60 * 60 * 1000) {
    usageStats.callsThisHour = 0;
    usageStats.costThisHour = 0;
    usageStats.hourStartTime = now;
  }
}

function checkUsageLimits() {
  resetHourlyStats();

  const maxCallsPerHour = parseInt(process.env.MAX_CLAUDE_CALLS_PER_HOUR || '100');
  const maxCostPerHour = parseFloat(process.env.MAX_COST_PER_HOUR || '1.00');

  if (usageStats.callsThisHour >= maxCallsPerHour) {
    throw new Error(`[Claude] Rate limit exceeded: ${usageStats.callsThisHour} calls this hour (max: ${maxCallsPerHour})`);
  }

  if (usageStats.costThisHour >= maxCostPerHour) {
    throw new Error(`[Claude] Cost limit exceeded: $${usageStats.costThisHour.toFixed(4)} this hour (max: $${maxCostPerHour})`);
  }
}

function calculateCost(usage) {
  const inputCost = (usage.input_tokens / 1_000_000) * HAIKU_PRICING.inputTokensPerMillion;
  const outputCost = (usage.output_tokens / 1_000_000) * HAIKU_PRICING.outputTokensPerMillion;
  return inputCost + outputCost;
}

function logUsageStats() {
  console.log(`[Claude Usage] Total calls: ${usageStats.totalCalls}, Total cost: $${usageStats.totalCostUSD.toFixed(4)}, This hour: ${usageStats.callsThisHour} calls / $${usageStats.costThisHour.toFixed(4)}`);
}

async function generateUseCaseNarrative({ transactionId, events, userEmail }) {
  // NOTE: No 'useCase' parameter! Claude must identify it from events.

  // Check cache first
  const cached = narrativeCache.get(transactionId);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL) {
    console.log(`[Claude] Cache hit for transaction ${transactionId}`);
    return cached;
  }

  // Build prompt asking Claude to IDENTIFY and GENERATE
  const prompt = buildPrompt(events, userEmail);

  try {
    // Check usage limits before making API call
    checkUsageLimits();

    const startTime = Date.now();
    const message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 500,
      temperature: 0.7,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    const latency = Date.now() - startTime;

    // Track usage and cost
    const cost = calculateCost(message.usage);
    usageStats.totalCalls++;
    usageStats.callsThisHour++;
    usageStats.totalTokensUsed += message.usage.input_tokens + message.usage.output_tokens;
    usageStats.totalCostUSD += cost;
    usageStats.costThisHour += cost;

    console.log(`[Claude] API call completed in ${latency}ms | Tokens: ${message.usage.input_tokens} in + ${message.usage.output_tokens} out | Cost: $${cost.toFixed(4)}`);
    logUsageStats();

    const result = parseClaudeResponse(message.content[0].text);

    // Cache result
    narrativeCache.set(transactionId, { ...result, cachedAt: Date.now() });

    return result;
  } catch (error) {
    console.error('[Claude] API error:', error.message);

    // If rate limit error, log and fallback
    if (error.message.includes('Rate limit') || error.message.includes('Cost limit')) {
      console.error('[Claude] Usage limit reached! Using fallback narrative.');
    }

    // Fallback to static template on error
    return generateFallbackNarrative('unknown');
  }
}

function buildPrompt(events, userEmail) {
  return `You are an identity security expert presenting to enterprise security buyers. Analyze these Okta events and:
1. IDENTIFY which use case this represents
2. GENERATE complete card content for the dashboard

**Known Use Cases:**
- "mfaLogin": Multi-factor authentication login flow (phishing-resistant access)
- "groupAssignment": Automated group membership assignment (workflow automation)
- "itpSessionAnomaly": Session context change detected (IP/location/device change during active session)
- "itpRiskElevation": User risk level elevated due to suspicious behavior
- "itpImpossibleTravel": Impossible travel detected (login from two distant locations in short time)
- "itpUniversalLogout": Universal logout triggered due to high-risk activity

**User**: ${userEmail}

**Events** (in chronological order):
${JSON.stringify(events, null, 2)}

**Task**: Generate a JSON response with EXACTLY this structure:
{
  "identifiedUseCase": "mfaLogin" | "groupAssignment" | "itpSessionAnomaly" | "itpRiskElevation" | "itpImpossibleTravel" | "itpUniversalLogout" | "unknown",
  "cardTitle": "Short title (e.g., 'ITP: Impossible Travel Detected')",
  "cardDescription": "One sentence summary of what happened",
  "narrative": "2-3 sentence story explaining what happened and why it matters for security",
  "businessOutcomes": [
    {
      "icon": "🛡️ or ⚡ or ✅ or 📊 or 🚨",
      "category": "Risk Reduced OR Efficiency Improved OR Compliance Maintained OR Threat Blocked",
      "description": "Specific business value (under 80 chars)"
    }
  ]
}

**Guidelines**:
- CRITICAL: First identify which use case based on event types:
  - If you see "user.authentication.auth_via_mfa" + "user.session.start" → "mfaLogin"
  - If you see "group.user_membership.add" → "groupAssignment"
  - If you see "user.session.context.change" → check behaviors:
    - behaviors includes "impossible_travel" → "itpImpossibleTravel"
    - otherwise → "itpSessionAnomaly"
  - If you see "user.risk.change" with elevated risk → "itpRiskElevation"
  - If you see Universal Logout action → "itpUniversalLogout"
  - If uncertain → "unknown"
- For ITP events, emphasize the behavioral signals in debugData.behaviors
- Extract risk levels (LOW/MEDIUM/HIGH) and include in narrative
- Focus on business value: "prevented session hijacking", "blocked credential theft"
- Use active voice and compelling language
- Keep narrative under 200 words
- Generate 2-3 business outcomes maximum
- Match tone to executive audience (CISOs, IT leaders)
- Extract specific details from events (user name, location, device, timing)`;
}

function parseClaudeResponse(text) {
  // 1. Try parsing the entire response as JSON
  try {
    return JSON.parse(text.trim());
  } catch {}

  // 2. Try extracting from markdown code block
  const codeBlockMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1]);
    } catch {}
  }

  // 3. Fall back to finding balanced braces
  const startIdx = text.indexOf('{');
  if (startIdx !== -1) {
    let depth = 0;
    for (let i = startIdx; i < text.length; i++) {
      if (text[i] === '{') depth++;
      else if (text[i] === '}') depth--;
      if (depth === 0) {
        try {
          return JSON.parse(text.substring(startIdx, i + 1));
        } catch {}
        break;
      }
    }
  }

  throw new Error('Failed to parse Claude response');
}

function generateFallbackNarrative(identifiedUseCase = 'unknown') {
  // Static fallback if Claude API fails
  const fallbacks = {
    mfaLogin: {
      identifiedUseCase: 'mfaLogin',
      cardTitle: 'MFA Login: Phishing-Resistant Authentication',
      cardDescription: 'User completed step-up authentication with hardware key',
      narrative: 'User completed phishing-resistant authentication using FIDO2 hardware key. The system detected new device behavior and enforced step-up authentication, preventing potential account compromise.',
      businessOutcomes: [
        { icon: '🛡️', category: 'Risk Reduced', description: 'Phishing-resistant MFA prevented credential theft' }
      ]
    },
    groupAssignment: {
      identifiedUseCase: 'groupAssignment',
      cardTitle: 'Group Assignment: Automated Provisioning',
      cardDescription: 'Automated group membership based on user attributes',
      narrative: 'Automated group membership assignment based on user attributes. Zero manual intervention required, reducing provisioning time from hours to seconds.',
      businessOutcomes: [
        { icon: '⚡', category: 'Efficiency Improved', description: 'Automated provisioning eliminated manual workflow' }
      ]
    },
    itpSessionAnomaly: {
      identifiedUseCase: 'itpSessionAnomaly',
      cardTitle: 'ITP: Session Context Change Detected',
      cardDescription: 'Anomalous session behavior detected and flagged for review',
      narrative: 'A session context change was detected indicating potential session compromise. The system identified anomalous behavior patterns such as IP or device changes during an active session, triggering enhanced monitoring.',
      businessOutcomes: [
        { icon: '🚨', category: 'Threat Blocked', description: 'Session anomaly detected before data exfiltration' }
      ]
    },
    itpRiskElevation: {
      identifiedUseCase: 'itpRiskElevation',
      cardTitle: 'ITP: User Risk Level Elevated',
      cardDescription: 'Suspicious behavior elevated user risk score triggering additional controls',
      narrative: 'User risk level was elevated due to suspicious behavioral signals. Identity Threat Protection analyzed multiple risk factors and automatically enforced additional security controls to protect the account.',
      businessOutcomes: [
        { icon: '📊', category: 'Risk Reduced', description: 'Behavioral analytics prevented potential account takeover' }
      ]
    },
    itpImpossibleTravel: {
      identifiedUseCase: 'itpImpossibleTravel',
      cardTitle: 'ITP: Impossible Travel Detected',
      cardDescription: 'Login from geographically impossible location blocked',
      narrative: 'An impossible travel event was detected when login attempts occurred from two distant geographic locations within an impossibly short timeframe, indicating potential credential compromise or session hijacking.',
      businessOutcomes: [
        { icon: '🛡️', category: 'Threat Blocked', description: 'Credential theft blocked via geographic anomaly detection' }
      ]
    },
    itpUniversalLogout: {
      identifiedUseCase: 'itpUniversalLogout',
      cardTitle: 'ITP: Universal Logout Triggered',
      cardDescription: 'High-risk activity triggered immediate session termination across all applications',
      narrative: 'Universal Logout was triggered after high-risk behavioral signals were detected. All active sessions for the user were immediately terminated across all connected applications, preventing potential lateral movement.',
      businessOutcomes: [
        { icon: '🚨', category: 'Threat Blocked', description: 'All sessions terminated preventing lateral movement' }
      ]
    }
  };
  return fallbacks[identifiedUseCase] || {
    identifiedUseCase: 'unknown',
    cardTitle: 'Identity Event Completed',
    cardDescription: 'Security event processed successfully',
    narrative: 'Use case completed successfully.',
    businessOutcomes: []
  };
}

module.exports = { generateUseCaseNarrative };
