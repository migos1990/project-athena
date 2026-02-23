# Project Athena — Production Readiness Plan

> **Status Legend:**
> `[ ]` = Not started · `[~]` = In progress · `[x]` = Complete · `[!]` = Blocked

---

## Executive Summary

Project Athena is a polished, feature-complete MVP built in a 9-day hackathon sprint. The core architecture (React 19, Express 5, WebSocket, Claude AI) is sound, but the system is currently a **controlled-environment prototype**, not a production-grade product. It has **zero tests, no authentication, no persistence, no containerization, and no observability**.

**Overall Grade: F for production readiness** — not due to bad code, but due to expected prototype gaps.

The plan below is organized into 5 sequential phases. Phases 1–2 are **blocking** (nothing should go to production without them). Phases 3–5 are **required** for a stable, scalable, and maintainable production system.

---

## Current State: Critical Findings

| Domain | Grade | Verdict |
|---|---|---|
| Feature completeness | A | All planned features implemented |
| Code organization | B | Clean separation of concerns |
| Security | F | No auth, open CORS, no rate limiting |
| Testing | F | Zero test files exist |
| Data persistence | F | All state is in-memory, lost on restart |
| CI/CD | F | No pipeline, 100% manual deployment |
| Monitoring & logging | C | `console.log` only, no persistence |
| Containerization | F | No Docker, no orchestration |
| Error handling | C | Basic try/catch, no error reporting |
| API documentation | D | No OpenAPI spec, no versioning |

---

## Phase 1 — Security Hardening *(Blocking)*

> **Status: `[~]` In Progress**
> **Target: 2–3 weeks**

Nothing ships to production without this phase complete.

### Checklist

- [ ] **1.1** — Authentication & Authorization
  - [ ] Implement Okta OAuth 2.0 / OIDC login middleware
  - [ ] Issue short-lived JWTs (1-hour expiry) with refresh token rotation
  - [ ] Define three roles: `admin`, `solution_engineer`, `viewer`
  - [ ] Gate all API endpoints with auth middleware check
  - [ ] Protect `/debug-log` (admin only) and `/webhook` (HMAC only)

- [ ] **1.2** — API Security
  - [ ] Replace `app.use(cors())` with explicit origin allowlist
  - [ ] Add Helmet.js for security headers (CSP, X-Frame-Options, HSTS)
  - [ ] Add Joi schema validation on all request bodies
  - [ ] Implement Okta Event Hook HMAC signature verification
  - [ ] Add express-rate-limit: 10 req/min on `/attack`, 100 req/min global
  - [ ] Lock down endpoint access by role:
    - `POST /attack` → `solution_engineer`
    - `POST /start-demo` → `solution_engineer`
    - `POST /reset-demo` → `solution_engineer`
    - `GET /debug-log` → `admin`
    - `GET|POST /webhook` → HMAC verified

- [ ] **1.3** — Secrets Management
  - [ ] Extract all hardcoded magic numbers to named env vars
  - [ ] Add startup config validator (fail fast on missing required vars)
  - [ ] Document all environment variables in `.env.example`
  - [ ] Evaluate secrets vault integration (AWS Secrets Manager or HashiCorp Vault)

- [ ] **1.4** — HTTPS / WSS Enforcement
  - [ ] Add HTTP → HTTPS redirect middleware
  - [ ] Ensure WebSocket connections use `wss://` in production
  - [ ] Configure TLS termination at nginx reverse proxy

### Notes / Decisions
_Add notes here as implementation progresses._

---

## Phase 2 — Data Persistence *(Blocking)*

> **Status: `[ ]` Not Started**
> **Target: 3–4 weeks**

The server currently holds all state in JavaScript variables. Any restart wipes everything.

### Checklist

- [ ] **2.1** — Database Design (PostgreSQL)
  - [ ] Design and create schema migrations (Knex.js or Prisma)
  - [ ] `demos` table
  - [ ] `use_cases` table
  - [ ] `events` table (with `okta_uuid UNIQUE` for deduplication)
  - [ ] `attacks` table
  - [ ] `claude_usage` table
  - [ ] `audit_log` table
  - [ ] Seed scripts for dev/staging environments

- [ ] **2.2** — Redis for Real-Time State
  - [ ] Move WebSocket fan-out to Redis Pub/Sub
  - [ ] Store demo session state in Redis (TTL = 24h)
  - [ ] Replace in-memory `narrativeCache` with Redis cache (TTL = 1h, manually invalidatable)
  - [ ] Move `processedEventUUIDs` set to Redis with TTL

- [ ] **2.3** — Migration Strategy
  - [ ] Set up Knex.js migration runner
  - [ ] Write migration files for every schema change
  - [ ] Add database connection pooling
  - [ ] Test backup/restore procedures

### Notes / Decisions
_Add notes here as implementation progresses._

---

## Phase 3 — Testing Infrastructure *(Required)*

> **Status: `[ ]` Not Started**
> **Target: 3–4 weeks**

The codebase currently has zero automated tests.

### Checklist

- [ ] **3.1** — Backend Unit Tests (Jest, target: 90%+ coverage)
  - [ ] Event deduplication logic
  - [ ] Timestamp gate filtering
  - [ ] MFA event correlation
  - [ ] Attack type routing
  - [ ] Claude API usage limit enforcement
  - [ ] WebSocket broadcast logic
  - [ ] HMAC signature validation
  - [ ] Rate limit behavior

- [ ] **3.2** — Frontend Unit Tests (Vitest + React Testing Library, target: 80%+)
  - [ ] `UseCaseCard` renders correctly in each state
  - [ ] `AttackCard` triggers correct callback
  - [ ] `Dashboard` reflects WebSocket messages
  - [ ] `RedTeamDashboard` attack flow
  - [ ] `useWebSocket` hook reconnection logic
  - [ ] `ErrorBoundary` catches render errors
  - [ ] Typewriter animation completes correctly

- [ ] **3.3** — Integration Tests
  - [ ] `POST /attack` → WebSocket broadcast received
  - [ ] `POST /webhook` (valid Okta event) → use case state updates
  - [ ] `POST /webhook` (duplicate UUID) → event skipped
  - [ ] `POST /start-demo` → state reset, clients notified
  - [ ] `POST /reset-demo` → all state cleared
  - [ ] Claude API failure → fallback narrative served

- [ ] **3.4** — End-to-End Tests (Cypress)
  - [ ] Full demo flow: start → MFA event → use case card animates
  - [ ] Red Team flow: launch attack → detection card appears
  - [ ] Reset flow: all cards clear
  - [ ] Connection loss: WebSocket reconnects with backoff
  - [ ] Unauthorized access: auth-gated pages redirect to login

- [ ] **3.5** — Security Tests
  - [ ] `POST /attack` without auth → 401
  - [ ] `POST /attack` with viewer role → 403
  - [ ] `POST /webhook` with invalid HMAC → 403
  - [ ] Rate limiting: 100 rapid requests → blocked after threshold
  - [ ] CORS: request from unauthorized origin → blocked

### Notes / Decisions
_Add notes here as implementation progresses._

---

## Phase 4 — CI/CD & Containerization *(Required)*

> **Status: `[ ]` Not Started**
> **Target: 2–3 weeks**

Currently: zero automation. Every deployment is manual and unvalidated.

### Checklist

- [ ] **4.1** — Dockerization
  - [ ] `server/Dockerfile` (Node 20 Alpine, multi-stage, non-root user)
  - [ ] `client/Dockerfile` (Node 20 Alpine build → nginx:alpine serve)
  - [ ] `docker-compose.yml` (backend, frontend, postgres, redis)
  - [ ] `.dockerignore` for both services
  - [ ] `nginx.conf` for frontend static serving + API proxy

- [ ] **4.2** — GitHub Actions CI Pipeline
  - [ ] On PR: lint, test, docker build, npm audit, SAST scan
  - [ ] On merge to main: build + push images, deploy to staging, smoke test
  - [ ] Manual approval gate before production deploy
  - [ ] Secrets configured in GitHub Actions environment

- [ ] **4.3** — Pre-commit Hooks
  - [ ] Install husky + lint-staged
  - [ ] ESLint + Prettier on staged files before every commit
  - [ ] Block commits with bare `console.log` in server code

### Notes / Decisions
_Add notes here as implementation progresses._

---

## Phase 5 — Monitoring, Observability & Scalability *(Required)*

> **Status: `[ ]` Not Started**
> **Target: 2–3 weeks**

### Checklist

- [ ] **5.1** — Structured Logging (Pino)
  - [ ] Replace all `console.log` / `console.error` with Pino logger
  - [ ] Use JSON-structured log format
  - [ ] Log levels: `debug` (dev), `info`, `warn`, `error`, `fatal`
  - [ ] Ship logs to Datadog / CloudWatch / ELK

- [ ] **5.2** — Metrics & APM
  - [ ] Instrument with Prometheus client (or Datadog APM)
  - [ ] Track: WebSocket connection count, events/sec, Claude API latency (P50/P95/P99), error rates
  - [ ] Build Grafana dashboard for real-time ops visibility
  - [ ] Set AlertManager rules: error rate >1%, Claude cost >$5/hr, latency >2s

- [ ] **5.3** — Error Reporting (Sentry)
  - [ ] Integrate Sentry on backend (unhandled rejections, API errors)
  - [ ] Integrate Sentry on frontend (React render errors)
  - [ ] Include user context (role, demo ID) in error reports

- [ ] **5.4** — Health Checks & Readiness Probes
  - [ ] Enhance `/health` to deep-check DB, Redis, Claude API reachability
  - [ ] Add `/ready` probe for Kubernetes readiness (fails until migrations complete)
  - [ ] Add `/metrics` endpoint for Prometheus scraping

- [ ] **5.5** — WebSocket Horizontal Scaling
  - [ ] Move WebSocket fan-out to Redis Pub/Sub
  - [ ] Enable sticky sessions at load balancer as fallback
  - [ ] Test with 2+ server instances running simultaneously
  - [ ] Configure Kubernetes HPA based on CPU/connection count

### Notes / Decisions
_Add notes here as implementation progresses._

---

## Prioritized Backlog

| Priority | Item | Phase | Status |
|---|---|---|---|
| P0 | Authentication (Okta OAuth 2.0) | 1 | `[ ]` |
| P0 | Input validation (Joi) on all endpoints | 1 | `[ ]` |
| P0 | Rate limiting (express-rate-limit) | 1 | `[ ]` |
| P0 | CORS allowlist | 1 | `[ ]` |
| P0 | Helmet.js security headers | 1 | `[ ]` |
| P0 | PostgreSQL + Redis integration | 2 | `[ ]` |
| P0 | Dockerize backend + frontend | 4 | `[ ]` |
| P1 | GitHub Actions CI pipeline | 4 | `[ ]` |
| P1 | Backend unit tests (Jest) | 3 | `[ ]` |
| P1 | Frontend unit tests (Vitest) | 3 | `[ ]` |
| P1 | Structured logging (Pino) | 5 | `[ ]` |
| P1 | Sentry error reporting | 5 | `[ ]` |
| P1 | Okta HMAC webhook validation | 1 | `[ ]` |
| P2 | OpenAPI / Swagger spec | — | `[ ]` |
| P2 | E2E tests (Cypress) | 3 | `[ ]` |
| P2 | Prometheus metrics + Grafana | 5 | `[ ]` |
| P2 | Redis Pub/Sub WebSocket scaling | 5 | `[ ]` |
| P2 | TypeScript migration | — | `[ ]` |
| P3 | CDN for static frontend assets | — | `[ ]` |
| P3 | API versioning (`/api/v1/`) | — | `[ ]` |

---

## Delivery Timeline

```
Week 1-3:   Phase 1 — Security Hardening       [~]
Week 4-7:   Phase 2 — Data Persistence          [ ]
Week 8-11:  Phase 3 — Testing Infrastructure    [ ]
Week 12-14: Phase 4 — CI/CD & Containerization  [ ]
Week 15-17: Phase 5 — Monitoring & Scalability  [ ]

Total: ~17 weeks to full production readiness
```

---

## What NOT to Change

The following are well-designed and should be preserved:

- The WebSocket architecture and `useWebSocket` hook with exponential backoff
- The Claude API service with graceful fallback narratives
- The event deduplication-by-UUID pattern
- The timestamp gate for demo isolation
- The component structure and Tailwind design system
- The `attacks.js` / `providers.js` configuration-as-data pattern

---

## Change Log

| Date | Phase | Change | Author |
|---|---|---|---|
| 2026-02-23 | All | Initial plan created from codebase analysis | Claude |
