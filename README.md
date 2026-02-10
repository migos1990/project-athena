# Project Athena

**Live Identity Security Fabric Dashboard** for Okta Solution Engineers

A real-time, interactive dashboard that visualizes Okta's Identity Security Fabric in action during live demos. Built for the Okta Presales Hackathon.

---

## 🚀 Quick Start

### Prerequisites
- Node.js v18+ and npm
- Okta tenant with Event Hooks capability
- ngrok (for exposing webhook endpoint to Okta)
- Anthropic API key (get from https://console.anthropic.com)

### 1. Configure Environment Variables
```bash
cd server
# Create .env file with your Anthropic API key
echo "ANTHROPIC_API_KEY=sk-ant-api03-YOUR_KEY_HERE" > .env
echo "MAX_CLAUDE_CALLS_PER_HOUR=100" >> .env
echo "MAX_COST_PER_HOUR=1.00" >> .env
```

### 2. Start the Backend
```bash
cd server
npm install
node index.js
```
Backend runs on port **3001** with WebSocket server active.

### 3. Start the Frontend
```bash
cd client
npm install
npm run dev
```
Frontend runs on port **5173**. Open http://localhost:5173

### 4. Configure Okta Event Hook (Optional)
To connect to a live Okta tenant:
```bash
# Expose webhook endpoint
ngrok http 3001

# In Okta Admin Console → Workflow → Event Hooks
# Create Event Hook:
#   URL: https://<ngrok-id>.ngrok.io/webhook
#   Events: user.session.start, user.authentication.auth_via_mfa,
#           group.user_membership.add, user.lifecycle.create
```

---

## 📖 Overview

Project Athena is an interactive dashboard that:
- **Tracks live demos** by listening to Okta Event Hooks in real-time
- **Visualizes the Identity Security Fabric** showing how capabilities interconnect
- **Provides multiple views**: Blue Team (defender), Red Team (attacker), and Pipeline View
- **Simulates attacks** with Red Team Dashboard showing 1st and 3rd party threat detection
- **Shows detailed event logs** for each security checkpoint in the access pipeline
- **Auto-detects use case completion** with AI-powered narratives and business outcome summaries

**Built for:** Okta Internal Presales Hackathon (GenAI for GenARR)
**Timeline:** 1-2 day rapid prototype
**Goal:** "Wow" prospects by showing the power of Okta's unified platform with real-time attack simulation

---

## ✨ Features

### Core Features (Version 1)
- **Real-time event tracking** via Okta Event Hooks with WebSocket push to UI
- **ISPM Hub visualization** showing Identity Security Posture Management detections
- **2×2 Capability Grid**: Access Management, IGA, PAM, ITDR with 16 use case cards
- **Demo state management** with Start/Reset controls and timestamp-based event filtering
- **Animated checkmarks** and card completion effects with business outcome displays
- **Connection health indicator** (green/red WebSocket status dot)
- **Raw event log viewer** with expandable JSON for debugging

### Version 2 Features (Current)
- **🔀 React Router navigation** with view toggle (Use Case View / Pipeline View)
- **🎯 Interactive Pipeline View** - SVG diagram showing the full Access Pipeline:
  - 6 main flow nodes (Need Access → Present Login → Verify Identity → MFA → Enrich User → Grant Access)
  - 4 Security Evaluation branches (Identity Verification, Breached Password, Custom Security, CAEP)
  - 3 Unified Security Outcome branches (Device Posture, Device Assurance, Token Hooks)
  - Click any node to inspect event logs in right-side drawer
  - Real-time highlighting when use cases complete
  - Raw log viewer per node with JSON data
- **⚡ ISPM Hub hover interaction** - Hover over "Orphaned Account" card to see 90-degree arrow connecting to "Automated User Offboarding" with "Triggers remediation" label
- **🔴 Generate Threats button** - Placeholder for future threat simulation feature under ITDR pillar

### Version 3 Features
- **🤖 AI-Powered Narration** - Claude API integration for dynamic content generation:
  - Real-time AI analysis of Okta events using Claude 4.5 Haiku
  - Automatic use case identification (no pre-labeling required)
  - Dynamic card content generation (title, description, narrative, business outcomes)
  - Context-aware narratives with specific details (user, location, device, timing)
  - Pre-defined card slots populated with AI-generated content
  - Purple gradient "AI Insights" section on completed cards
  - Fallback to static templates if Claude API fails
- **💰 Cost-Optimized Architecture**:
  - In-memory caching prevents duplicate API calls (~$0.002 per use case)
  - Usage tracking with configurable rate limits (100 calls/hour, $1/hour default)
  - Real-time cost monitoring in server logs
  - Estimated demo cost: $0.02-0.05 per session
- **🔒 Robust Error Handling**:
  - Graceful degradation with static fallback narratives
  - No frontend breakage if API is unavailable
  - Transaction-based event correlation ensures accuracy

### Version 4 Features (Current)
- **🔴 Red Team Dashboard** - Attack simulation from attacker's perspective:
  - Blue/Red Team toggle in header navigation
  - 4 simulated attack patterns (1st Party Data detection):
    - Password Spray - triggers ITDR Anomalous Behavior Analysis
    - Partially Offboarded User - triggers ISPM detection
    - Unauthorized MFA Reset - triggers ITDR Anomalous Behavior Analysis
    - Cookie Theft (Session Replay) - triggers ISPM Orphaned Account detection
  - Real-time attack launch with "Launch Attack" buttons
  - Attack Activity Log showing chronological attack history with 1st/3rd party indicators
  - Attacks trigger corresponding Blue Team detections with 1.5-3 second delay
- **📡 SSF Transmitter Integration** - 3rd Party threat detection:
  - Full SSF (Shared Signals Framework) transmitter UI integrated into Red Team Dashboard
  - Multiple security providers (CrowdStrike, Microsoft Defender, Okta ITDR, Zscaler, Netskope)
  - 4 threat event types per provider (Malware Detected, Suspicious Process, etc.)
  - RSA-256 key generation and JWKS export
  - Real-time JWT payload viewer
  - Config persistence via localStorage
  - SSF events appear in Attack Activity Log as "3rd Party" threats
- **🎯 Organized Threat Sections**:
  - "Threats identified by 1st Party Data" - collapsible pillar section (red)
  - "Threats identified by 3rd Party Data" - collapsible pillar section (purple)
  - Unified Attack Activity Log at bottom with responsive 3-column grid layout
  - Consistent visual language with Blue Team Dashboard
- **⚡ Demo Reset Synchronization**:
  - Reset button clears both attacks and detections
  - Clean slate for repeated demos
  - Attack log and detection states fully synchronized

---

## 🎮 Demo Workflow

### Blue Team (Defender) Workflow
1. **Open Dashboard** - All cards show greyed out in "pending" state
2. **Click "Start Demo"** - Records timestamp; only events after this time are processed
3. **Perform live Okta demo** - Login with MFA, assign user to group, etc.
4. **Watch cards complete** - Animated checkmarks, AI-powered narratives, business outcomes appear
5. **Switch to Pipeline View** - See access flow diagram with highlighted nodes
6. **Click nodes** - Inspect event logs showing exactly what happened at each step
7. **Hover ISPM Hub** - See security posture detections trigger remediation workflows

### Red Team (Attacker) Workflow
1. **Click "Red Team Dashboard"** in header - Switch to attacker perspective
2. **Launch 1st Party Attacks** - Click "Launch Attack" on any of 4 attack patterns
3. **Watch Attack Activity Log** - See attacks appear in chronological order with timestamps
4. **Transmit SSF Events** - Configure SSF transmitter and send 3rd party threat signals
5. **Switch to Blue Team** - See corresponding detections light up in real-time (1.5-3s delay)
6. **Verify ITDR/ISPM Response** - Confirm attacks triggered correct security pillar detections
7. **Click "Reset"** - Clear all attacks and detections for fresh demo

---

## 🧩 Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Frontend** | React 19 + Vite 7 | Modern, fast, component-based development |
| **Routing** | React Router v7 | Multi-view navigation with clean URLs |
| **Styling** | Tailwind CSS v4 | Rapid UI development with Okta brand colors |
| **Backend** | Node.js + Express | JavaScript everywhere, simple REST + WebSocket |
| **Real-time** | WebSocket (ws library) | Instant UI updates, bidirectional communication |
| **Event Processing** | Custom event correlator | Matches related events (e.g., MFA challenge + validation) |
| **Visualization** | SVG + foreignObject | Scalable, interactive pipeline diagram |
| **State Management** | React hooks (useState, useMemo) | Lifted state pattern for cross-route sharing |
| **AI Integration** | Claude 4.5 Haiku via Anthropic SDK | Real-time event interpretation and content generation |

---

## 📁 Project Structure

```
project-athena/
├── client/                              # React frontend (Vite)
│   ├── src/
│   │   ├── components/
│   │   │   ├── Dashboard.jsx            # Blue Team View (defender perspective)
│   │   │   ├── RedTeamDashboard.jsx     # Red Team View (attacker perspective)
│   │   │   ├── AccessPipeline.jsx       # Pipeline View page
│   │   │   ├── PipelineDiagram.jsx      # SVG pipeline diagram with clickable nodes
│   │   │   ├── Header.jsx               # Top nav with Blue/Red team toggle
│   │   │   ├── StatsBanner.jsx          # Stats bar (team-aware metrics)
│   │   │   ├── ISPMHub.jsx              # Security posture detection cards
│   │   │   ├── AttackCard.jsx           # Individual attack pattern card
│   │   │   ├── ConnectionArrow.jsx      # ISPM hover arrow overlay
│   │   │   ├── UseCaseCard.jsx          # Individual use case card
│   │   │   ├── PillarSection.jsx        # Pillar section container (collapsible)
│   │   │   ├── GenerateThreats.jsx      # Legacy threat simulation page (deprecated)
│   │   │   └── SSF/
│   │   │       ├── SSFDashboard.jsx     # SSF Transmitter standalone view
│   │   │       ├── EventGrid.jsx        # SSF event selection grid
│   │   │       └── ActivityLog.jsx      # SSF activity log component
│   │   ├── config/
│   │   │   ├── attacks.js               # Attack pattern definitions
│   │   │   └── providers.js             # SSF provider configurations
│   │   ├── hooks/
│   │   │   └── useWebSocket.js          # WebSocket connection hook
│   │   ├── App.jsx                      # Root with BrowserRouter + Routes
│   │   └── index.css                    # Global styles + animations
│   └── package.json
│
├── server/                              # Express backend
│   ├── index.js                         # Express + WebSocket + Attack endpoint
│   └── package.json
│
├── Pipeline/
│   ├── Version 2.md                     # Feature planning for Version 2
│   └── Project Athena.pptx              # Pipeline diagram reference
│
├── Screenshots & Logos/                 # Demo assets and branding
│   ├── Okta_logo_(2023).svg.png
│   └── Screenshot 2026-02-07 at 2.51.31 PM.png
│
├── PRD.md                               # Original product requirements
└── README.md                            # This file
```

---

## 🎯 Use Cases Tracked

### 1. MFA Login (Access Management)
**Okta Events:** `user.session.start` + `user.authentication.auth_via_mfa`

**Pipeline Nodes Activated:**
- Need Access → Present Login → Verify Identity → MFA → Enrich User → Grant Access
- Identity Verification, Breached Password Detection
- Device Posture Checks, Device Assurance

**Business Outcomes:**
- 🔒 **Risk Reduced:** Phishing-resistant authentication
- ⚡ **Productivity Improved:** Fast, seamless login experience

**Event Logs:** Shows MFA challenge sent, validated, device posture evaluated, etc.

### 2. Group Assignment (IGA - Identity Governance)
**Okta Events:** `group.user_membership.add` or `user.lifecycle.create`

**Pipeline Nodes Activated:**
- Need Access → Present Login → Verify Identity → Enrich User → Grant Access
- Identity Verification

**Business Outcomes:**
- ✅ **Efficiency Improved:** Automated provisioning via group membership
- 📊 **Compliance Maintained:** Audit trail of access changes

**Event Logs:** Shows directory sync, group membership update, entitlements recalculated

### ISPM Detections (Security Posture)
- **Partially Offboarded User** - User deprovisioned from some but not all apps
- **Unmanaged Service Account** - Service account without lifecycle management
- **Weak Password Policy** - Policy not meeting security standards
- **Orphaned Account** - Account exists without active ownership (triggers remediation arrow)

---

## 🔄 Demo State Management

The dashboard uses a **timestamp-based gate** to ensure clean demo starts:

1. **Standby Mode** - Dashboard loads with all cards greyed out. Events are received but not processed.
2. **Start Demo** - SE clicks button, `demoStartTime` is recorded. Only events with `published >= demoStartTime` are processed.
3. **Active State** - Events matching use cases trigger card completion with animated checkmarks.
4. **Reset Demo** - Clears all state, sets new timestamp, ready for next demo.

This prevents old/duplicate events from polluting the demo experience.

---

## 🎨 Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Event Delivery** | Push (Event Hooks) | Real-time, no polling overhead |
| **Event Correlation** | Bidirectional matching | Handles out-of-order event delivery |
| **Log Interpretation** | Pre-written templates | Zero API latency, no LLM costs |
| **TypeScript** | No | Faster iteration for hackathon timeline |
| **State Persistence** | None (in-memory) | POC simplicity, fresh start per demo |
| **Pipeline Diagram** | SVG with React | Scalable, interactive, customizable |
| **Node Inspection** | Click-to-inspect drawer | Non-intrusive, detailed event logs |
| **View Toggle** | React Router | Clean URLs, shareable links |

---

## 📊 Version History

### Version 4.0 (Feb 10, 2026) - **Current**
**Red Team Dashboard & Attack Simulation**
- ✅ Add Blue/Red Team toggle in header navigation
- ✅ Create Red Team Dashboard with attacker perspective
- ✅ Implement 4 attack patterns (1st Party Data):
  - Password Spray → ITDR Anomalous Behavior Analysis
  - Partially Offboarded User → ISPM detection
  - Unauthorized MFA Reset → ITDR Anomalous Behavior Analysis
  - Cookie Theft (Session Replay) → ISPM Orphaned Account
- ✅ Integrate SSF Transmitter into Red Team Dashboard (3rd Party Data section)
- ✅ Create AttackCard component with launch functionality
- ✅ Build Attack Activity Log with 1st/3rd party indicators
- ✅ Add /attack server endpoint with detection triggering
- ✅ Implement delayed detection broadcast (1.5-3s) for realistic demo effect
- ✅ Create attacks.js config with attack-to-detection mapping
- ✅ Add collapsible pillar sections for threat organization
- ✅ Synchronize reset functionality across Red/Blue Team dashboards
- ✅ Add team-aware stats banner (attacks launched vs use cases completed)
- ✅ Create responsive 3-column Activity Log grid layout

### Version 3.0 (Feb 9, 2026)
**AI-Powered Narration & Content Generation**
- ✅ Integrate Claude 4.5 Haiku API for real-time event interpretation
- ✅ Implement dynamic use case identification (no pre-labeling)
- ✅ Generate context-aware narratives with event details
- ✅ Create AI-generated business outcome badges
- ✅ Add purple gradient "AI Insights" section to completed cards
- ✅ Build cost-optimized architecture with in-memory caching
- ✅ Add usage tracking and configurable rate limits
- ✅ Implement graceful fallback to static templates
- ✅ Add transaction-based event correlation for accuracy

### Version 2.0 (Feb 8, 2026)
**Pipeline View & Interactive Features**
- ✅ Add React Router v7 for multi-page navigation
- ✅ Create Pipeline View with interactive SVG access flow diagram
- ✅ Implement click-to-inspect: select nodes to view event logs in side panel
- ✅ Add raw log viewer with expandable JSON per node
- ✅ Highlight active nodes when use cases complete (MFA Login, Group Assignment)
- ✅ Extract Header and StatsBanner components for cross-route reuse
- ✅ Lift state from Dashboard to App for route-level state sharing
- ✅ Add ISPM hover arrow: Orphaned Account → Automated User Offboarding
- ✅ Create Generate Threats placeholder page with navigation
- ✅ Add 90-degree arrow overlay with "Triggers remediation" label
- ✅ Implement 3-layer pipeline: Security Evaluations, Integrations & Workflows, Unified Security Outcomes
- ✅ Add layer labels with color coding
- ✅ Show 13 total nodes (6 main flow, 4 top branches, 3 bottom branches)
- ✅ Add selected node visual state (dashed ring indicator)

### Version 1.0 (Feb 3-7, 2026)
**Core Dashboard & Real-time Tracking**
- ✅ Build React frontend with Vite + Tailwind CSS
- ✅ Implement Express backend with WebSocket server
- ✅ Create Okta Event Hook receiver endpoint (`/webhook`)
- ✅ Build ISPM Hub with 4 security posture detection cards
- ✅ Create 2×2 capability grid (Access Management, IGA, PAM, ITDR)
- ✅ Implement 16 use case cards with animated checkmarks
- ✅ Add demo state management (Start/Reset with timestamp gate)
- ✅ Implement MFA Login use case (event correlation)
- ✅ Add Group Assignment use case
- ✅ Create business outcome displays with color-coded badges
- ✅ Add raw event log viewer with expandable JSON
- ✅ Implement connection health indicator
- ✅ Add live WebSocket updates with reconnection logic
- ✅ Apply Okta brand design system (Space Grotesk font, color palette)
- ✅ Add slide-in animations and checkmark path animations

### Version 0.3.0 (Feb 3, 2026)
**Okta Integration Planning**
- Finalized Event Hook strategy (OIG events, bidirectional correlation)
- Defined timestamp-based event filtering approach
- Created event processor architecture

### Version 0.2.0 (Feb 3, 2026)
**Enhanced UI Mockup**
- Added flow indicators between ISPM Hub and capability grid
- Added cross-over use cases visualization
- Implemented action buttons (Screenshot, Raw Logs)

### Version 0.1.0 (Feb 3, 2026)
**Initial Prototype**
- Created static HTML mockup with ISPM Hub layout
- Designed 2×2 capability grid
- Implemented CSS animations for checkmarks and card completion

---

## 🔮 Future Enhancements (Out of Scope)

- **Additional Use Cases**: PAM privileged session with live Okta events
- **Animated User Token**: Token flowing through pipeline nodes (toggle on/off)
- **Multi-Tenant Support**: Configure multiple Okta orgs
- **Session Persistence**: Save demo state to database
- **Cloud Deployment**: AWS/Vercel hosting with production WebSocket
- **TypeScript Migration**: Type safety for larger codebase
- **Screenshot Feature**: Capture and download demo snapshots (currently button placeholder)
- **Custom Security Remediations**: Show actual remediation workflow execution
- **CAEP Integration**: Continuous Access Evaluation Protocol live monitoring
- **Attack Playbook Library**: Pre-configured attack sequences for common threat scenarios
- **Multi-Stage Attack Campaigns**: Chain multiple attacks together
- **Detection Analytics**: Track detection rates and response times

---

## 🛠️ Development Commands

```bash
# Install dependencies
cd server && npm install
cd client && npm install

# Run development servers
npm run dev         # Frontend (Vite dev server)
node server/index.js   # Backend (Express + WebSocket)

# Build for production
cd client && npm run build

# Expose webhook for Okta (development)
ngrok http 3001

# Check WebSocket connection
# Open browser console on http://localhost:5173
# Look for "WebSocket connected" message
```

---

## 📝 Files Reference

| File | Purpose |
|------|---------|
| `client/src/App.jsx` | Root component with BrowserRouter, Routes, team view state, and WebSocket |
| `client/src/components/Dashboard.jsx` | Blue Team View - defender perspective with ISPM Hub + 2×2 pillars |
| `client/src/components/RedTeamDashboard.jsx` | Red Team View - attacker perspective with attack patterns and SSF |
| `client/src/components/AccessPipeline.jsx` | Pipeline View - access flow page with event log drawer |
| `client/src/components/PipelineDiagram.jsx` | SVG diagram with clickable nodes, connectors, and highlighting |
| `client/src/components/Header.jsx` | Navigation header with Blue/Red team toggle |
| `client/src/components/StatsBanner.jsx` | Team-aware stats (use cases vs attacks) |
| `client/src/components/AttackCard.jsx` | Individual attack pattern card with launch button |
| `client/src/components/SSF/EventGrid.jsx` | SSF event selection grid |
| `client/src/config/attacks.js` | Attack pattern definitions and detection mappings |
| `client/src/config/providers.js` | SSF provider configurations (CrowdStrike, Microsoft, etc.) |
| `server/index.js` | Express + WebSocket + Event Hook + /attack endpoint + AI integration |
| `Pipeline/Version 2.md` | Feature planning for Version 2 enhancements |
| `Pipeline/Project Athena.pptx` | Reference pipeline diagram from PowerPoint |
| `PRD.md` | Original product requirements and success criteria |

---

## 🤝 Contributors

Built with **Claude Code (Sonnet 4.5)** for the Okta Presales Hackathon.

Special thanks to the Okta SE team for the use case requirements and feedback.

---

## 📄 License

Internal Okta project for demo purposes.
