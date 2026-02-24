# Recurring Payments Tracker — App Plan

## Overview

A web app that connects to your credit card(s) and surfaces all recurring/subscription charges in one clean dashboard — so you can see what you're being charged, how often, and how much.

---

## Tech Stack

| Layer | Technology | Reason |
|-------|-----------|--------|
| Frontend | React + Vite | Already used in this repo |
| Styling | Tailwind CSS | Fast, utility-first |
| Backend | Node.js + Express | Already used in this repo |
| Database | SQLite (dev) / PostgreSQL (prod) | Lightweight to start |
| Bank/Card Data | Plaid API | Industry-standard open banking API |
| AI Categorization | Claude API | Detect & label recurring patterns |

---

## Core Features

### Phase 1 — MVP
1. **Connect a credit card** via Plaid Link (OAuth flow)
2. **Transaction sync** — pull last 12 months of transactions
3. **Recurring detection** — identify subscriptions by merchant + amount + frequency
4. **Dashboard** — list all recurring charges with:
   - Merchant name & logo
   - Amount
   - Billing frequency (monthly, annual, weekly)
   - Last charged date / next expected charge date
   - Category (streaming, SaaS, utilities, etc.)
5. **Monthly spend summary** — total recurring cost per month / year

### Phase 2 — Enhancements
6. **Alerts** — notify when a new recurring charge is detected
7. **Cancel tracking** — mark subscriptions as cancelled and stop expecting them
8. **Multi-card support** — connect multiple cards/accounts
9. **Trend view** — chart showing recurring spend over time
10. **Export** — download as CSV

---

## Data Model

```
User
  id, email, created_at

PlaidItem
  id, user_id, access_token, institution_name, created_at

Transaction
  id, plaid_item_id, plaid_transaction_id, merchant_name, amount,
  date, category, raw_json

RecurringPayment
  id, user_id, merchant_name, merchant_logo_url, normalized_amount,
  frequency (monthly|annual|weekly|other), last_charged_at,
  next_expected_at, category, is_active, first_seen_at
```

---

## Backend API Endpoints

```
POST   /api/auth/register          Create account
POST   /api/auth/login             Login
POST   /api/plaid/link-token       Generate Plaid Link token
POST   /api/plaid/exchange-token   Exchange public token → access token
POST   /api/plaid/sync             Fetch latest transactions
GET    /api/recurring              List all detected recurring payments
PUT    /api/recurring/:id          Update (e.g. mark cancelled)
GET    /api/summary                Monthly/annual spend totals
```

---

## Recurring Detection Algorithm

1. Group transactions by normalized merchant name
2. Filter groups with **3+ occurrences**
3. Calculate intervals between charges
4. If intervals are consistently ~30 days → **monthly**
5. If intervals are consistently ~365 days → **annual**
6. If intervals are consistently ~7 days → **weekly**
7. Use Claude API to confirm and categorize ambiguous merchants

---

## UI / Screens

```
┌──────────────────────────────────────────┐
│  Recurring Payments                 [+]  │
│  $847 / month  ·  $10,164 / year         │
├──────────────────────────────────────────┤
│  🎵 Spotify          $9.99   monthly     │
│  📺 Netflix          $15.49  monthly     │
│  ☁️  AWS             $47.20  monthly     │
│  🏋️  Gym             $29.99  monthly     │
│  📦 Amazon Prime     $139    annual      │
│  ...                                     │
└──────────────────────────────────────────┘
```

**Screens:**
1. **Login / Register**
2. **Connect Card** (Plaid Link widget)
3. **Dashboard** (recurring payments list)
4. **Detail view** (charge history for a single subscription)
5. **Summary** (charts, totals)
6. **Settings** (manage connected accounts)

---

## Project Structure

```
/
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── RecurringCard.jsx
│   │   │   ├── SummaryBanner.jsx
│   │   │   └── PlaidLinkButton.jsx
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── ConnectCard.jsx
│   │   │   └── Login.jsx
│   │   └── App.jsx
├── server/
│   ├── routes/
│   │   ├── auth.js
│   │   ├── plaid.js
│   │   └── recurring.js
│   ├── services/
│   │   ├── plaidService.js
│   │   ├── recurringDetection.js
│   │   └── claudeService.js
│   └── index.js
```

---

## Implementation Steps

- [ ] **Step 1** — Set up Plaid developer account & get sandbox credentials
- [ ] **Step 2** — Build auth (register/login with JWT)
- [ ] **Step 3** — Integrate Plaid Link + transaction sync
- [ ] **Step 4** — Build recurring detection algorithm
- [ ] **Step 5** — Build REST API for recurring payments
- [ ] **Step 6** — Build React dashboard UI
- [ ] **Step 7** — Add Claude API for merchant categorization
- [ ] **Step 8** — Add summary/charts view
- [ ] **Step 9** — Polish, test, deploy

---

## Environment Variables Needed

```
# Plaid
PLAID_CLIENT_ID=
PLAID_SECRET=
PLAID_ENV=sandbox        # sandbox | development | production

# Claude
ANTHROPIC_API_KEY=

# App
JWT_SECRET=
DATABASE_URL=
PORT=3001
```

---

## Notes & Decisions

- **Plaid sandbox** has test credentials so you can build without a real bank account
- **No real card data is stored** — Plaid handles the sensitive stuff; we only store derived transaction records
- Start with **SQLite** locally, migrate to **PostgreSQL** for production
- The recurring detection can run **on-demand** (triggered by sync) or on a **nightly cron**
