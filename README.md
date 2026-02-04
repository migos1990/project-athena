# Project Athena

**Live Identity Security Fabric Dashboard** for Okta Solution Engineers

---

## Overview

Project Athena is a real-time dashboard that Solution Engineers display alongside Okta demos. The dashboard automatically tracks and checks off demonstrated use cases by listening to Okta Syslog events via Event Hooks, with pre-written human-readable interpretations.

**Built for:** Internal Okta Presales Hackathon (1-2 day timeline)

**Goal:** "Wow" prospects with a visual companion to live demos that shows the interconnected Identity Security Fabric in action.

---

## Features

- **Real-time event tracking** via Okta Event Hooks (push model)
- **ISPM Hub layout** showing how Identity Security Posture Management connects to other capabilities
- **2x2 Capability Grid:** Access Management, IGA, PAM, ITDR
- **Pre-written interpretations** with variable injection (company name, user count)
- **Animated checkmarks** and card completion effects
- **Start/Reset Demo** button with timestamp-based event filtering
- **Connection health indicator** (green/red dot)

---

## Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Frontend | React + Vite + Tailwind CSS | Modern, fast, component-based |
| Backend | Node.js + Express | JavaScript everywhere |
| Real-time | WebSocket | Instant UI updates |
| Log Interpretation | Pre-written messages | Zero latency, no API costs |
| Syslog Integration | Okta Event Hooks | Real-time push via ngrok |

---

## MVP Use Cases

### 1. MFA Login (Access Management)
**Events:** `user.session.start` + `user.authentication.auth_via_mfa`

**Outcomes:**
- Risk reduced (phishing-resistant auth)
- User productivity improved (fast login)

### 2. Access Request & Provisioning (IGA - OIG)
**Events:** `access.request.create` + `access.request.action` + `application.user_membership.add`

**Outcomes:**
- Efficiency improved (automated provisioning)
- Risk reduced (audit trail, approval workflow)

---

## Demo State Management

The dashboard uses a **timestamp-based gate** to ensure clean demo starts:

1. **Standby Mode:** Dashboard loads with all cards greyed out. Events are received but not processed.
2. **Start Demo:** SE clicks button, timestamp is recorded. Only events with `published >= startTime` are processed.
3. **Reset Demo:** Clears all state and sets new timestamp for a fresh start.

---

## Project Structure

```
project-athena/
├── client/                     # React frontend (Vite)
│   ├── src/
│   │   ├── components/         # Dashboard, UseCaseCard, etc.
│   │   ├── hooks/              # useWebSocket
│   │   └── data/               # Use case definitions
│   └── package.json
│
├── server/                     # Express backend
│   ├── index.js                # Express + WebSocket server
│   ├── eventProcessor.js       # Event → use case mapping
│   └── package.json
│
├── mockup.html                 # Static UI reference
├── PRD.md                      # Product requirements
├── SESSION_SUMMARY.md          # Context for resuming work
├── OKTA_LOG_QUESTIONS.md       # Okta integration Q&A
└── README.md                   # This file
```

---

## Quick Start

```bash
# Terminal 1: Start backend
cd server
npm install
node index.js

# Terminal 2: Start frontend
cd client
npm install
npm run dev

# Terminal 3: Expose webhook (for Okta Event Hooks)
ngrok http 3001
```

Then configure an Okta Event Hook pointing to your ngrok URL.

---

## Okta Event Hook Configuration

1. Run `ngrok http 3001`
2. In Okta Admin Console → Workflow → Event Hooks → Create:
   - **Name:** Demo Dashboard
   - **URL:** `https://<ngrok-id>.ngrok.io/webhook`
   - **Events:**
     - `user.session.start`
     - `user.authentication.auth_via_mfa`
     - `access.request.create`
     - `access.request.action`
     - `application.user_membership.add`
3. Click **Verify**

---

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Event delivery | Push (Event Hooks) | Real-time, no polling |
| Log interpretation | Pre-written | Zero API latency/cost |
| TypeScript | No | Faster iteration for hackathon |
| Setup screen | Hardcoded | POC simplicity |
| Okta version | OIG (modern) | `access.request.*` events |
| State reset | Timestamp gate | Handles delayed event delivery |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 0.1.0 | Feb 3, 2026 | Initial mockup with ISPM hub layout, 2x2 grid, animations |
| 0.2.0 | Feb 3, 2026 | Added flow indicators, cross-over use cases, action buttons |
| 0.3.0 | Feb 3, 2026 | Finalized Okta integration plan (OIG events, timestamp gate) |

---

## Files Reference

| File | Purpose |
|------|---------|
| `mockup.html` | Static UI reference with all CSS/animations |
| `PRD.md` | Original product requirements |
| `SESSION_SUMMARY.md` | Session context for AI assistants |
| `OKTA_LOG_QUESTIONS.md` | Okta log handling Q&A |

---

## Out of Scope (Future)

- Additional use cases (PAM, ITDR live events)
- Claude API for dynamic interpretations
- Cloud deployment
- TypeScript migration
- Session persistence

---

## Contributors

Built with Claude Code for the Okta Presales Hackathon.
