# Project Athena

**Live Identity Security Fabric Dashboard** for Okta Solution Engineers

A real-time, interactive dashboard that visualizes Okta's Identity Security Fabric in action during live demos. Built for the Okta Presales Hackathon.

---

## 🚀 Quick Start

### Prerequisites
- Node.js v18+ and npm
- Okta tenant with Event Hooks capability
- ngrok (for exposing webhook endpoint to Okta)

### 1. Start the Backend
```bash
cd server
npm install
node index.js
```
Backend runs on port **3001** with WebSocket server active.

### 2. Start the Frontend
```bash
cd client
npm install
npm run dev
```
Frontend runs on port **5173**. Open http://localhost:5173

### 3. Configure Okta Event Hook (Optional)
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
- **Provides two views**: Use Case View (status cards) and Pipeline View (access flow diagram)
- **Shows detailed event logs** for each security checkpoint in the access pipeline
- **Auto-detects use case completion** with animated checkmarks and business outcome summaries

**Built for:** Okta Internal Presales Hackathon
**Timeline:** 1-2 day rapid prototype
**Goal:** "Wow" prospects by showing the power of Okta's unified platform

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

---

## 🎮 Demo Workflow

1. **Open Dashboard** - All cards show greyed out in "pending" state
2. **Click "Start Demo"** - Records timestamp; only events after this time are processed
3. **Perform live Okta demo** - Login with MFA, assign user to group, etc.
4. **Watch cards complete** - Animated checkmarks, business outcomes appear
5. **Switch to Pipeline View** - See access flow diagram with highlighted nodes
6. **Click nodes** - Inspect event logs showing exactly what happened at each step
7. **Hover ISPM Hub** - See security posture detections trigger remediation workflows
8. **Click "Reset"** - Clear all state for a fresh demo start

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

---

## 📁 Project Structure

```
project-athena/
├── client/                              # React frontend (Vite)
│   ├── src/
│   │   ├── components/
│   │   │   ├── Dashboard.jsx            # Use Case View (main grid)
│   │   │   ├── AccessPipeline.jsx       # Pipeline View page
│   │   │   ├── PipelineDiagram.jsx      # SVG pipeline diagram with clickable nodes
│   │   │   ├── Header.jsx               # Top nav with view toggle
│   │   │   ├── StatsBanner.jsx          # Stats bar (use cases completed)
│   │   │   ├── ISPMHub.jsx              # Security posture detection cards
│   │   │   ├── ConnectionArrow.jsx      # ISPM hover arrow overlay
│   │   │   ├── UseCaseCard.jsx          # Individual use case card
│   │   │   ├── PillarSection.jsx        # Pillar section container
│   │   │   └── GenerateThreats.jsx      # Placeholder threat simulation page
│   │   ├── hooks/
│   │   │   └── useWebSocket.js          # WebSocket connection hook
│   │   ├── App.jsx                      # Root with BrowserRouter + Routes
│   │   └── index.css                    # Global styles + animations
│   └── package.json
│
├── server/                              # Express backend
│   ├── index.js                         # Express + WebSocket + Event Hook receiver
│   └── package.json
│
├── Pipeline/
│   ├── Version 2.md                     # Feature planning for Version 2
│   └── Project Athena.pptx              # Pipeline diagram reference
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

### Version 2.0 (Feb 8, 2026) - **Current**
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

- **Additional Use Cases**: PAM privileged session, ITDR threat detection with live events
- **Animated User Token**: Token flowing through pipeline nodes (toggle on/off)
- **AI-Powered Interpretations**: Claude API for dynamic event narration
- **Multi-Tenant Support**: Configure multiple Okta orgs
- **Session Persistence**: Save demo state to database
- **Cloud Deployment**: AWS/Vercel hosting with production WebSocket
- **TypeScript Migration**: Type safety for larger codebase
- **Screenshot Feature**: Capture and download demo snapshots
- **Custom Security Remediations**: Show actual remediation workflows
- **CAEP Integration**: Continuous Access Evaluation Protocol live monitoring

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
| `client/src/App.jsx` | Root component with BrowserRouter, Routes, and lifted state |
| `client/src/components/Dashboard.jsx` | Use Case View - main grid with ISPM Hub + 2×2 pillars |
| `client/src/components/AccessPipeline.jsx` | Pipeline View - access flow page with event log drawer |
| `client/src/components/PipelineDiagram.jsx` | SVG diagram with clickable nodes, connectors, and highlighting |
| `server/index.js` | Express server + WebSocket + Event Hook endpoint + event correlation |
| `Pipeline/Version 2.md` | Feature planning and design for Version 2 enhancements |
| `Pipeline/Project Athena.pptx` | Reference pipeline diagram from PowerPoint |
| `PRD.md` | Original product requirements and success criteria |

---

## 🤝 Contributors

Built with **Claude Code (Sonnet 4.5)** for the Okta Presales Hackathon.

Special thanks to the Okta SE team for the use case requirements and feedback.

---

## 📄 License

Internal Okta project for demo purposes.
