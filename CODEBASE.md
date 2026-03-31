# eKakeibo — Codebase Overview

> **Purpose of this document:** Onboard an LLM (or new developer) to understand this application quickly. Covers architecture, data flow, key files, and implementation patterns.

---

## What Is This App?

**eKakeibo** is a personal finance tracking Progressive Web App (PWA) with a minimalist **Japandi** aesthetic. It uses **Google Sheets as a backend** — no server, no traditional database. The user authenticates via Google OAuth, and the app reads their spreadsheet data directly from the client.

**Kakeibo** (家計簿) is a Japanese budgeting philosophy focused on mindful spending.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 + TypeScript |
| Build | Vite 7 |
| State / Fetching | TanStack Query v5 |
| Virtualization | TanStack Virtual v3 |
| Auth | `@react-oauth/google` (Google OAuth 2.0) |
| Styling | CSS Modules + CSS Custom Properties |
| PWA | `vite-plugin-pwa` (Workbox) |
| Backend | Google Sheets API v4 (no server) |
| Deployment | Vercel |

---

## Project Structure

```
src/
├── main.tsx                    # Entry point — mounts React, wraps with QueryClientProvider
├── App.tsx                     # Root component: token state, page routing, auth gate
├── index.css                   # Global resets
├── config/
│   └── sheets.ts               # SHEET_ID constant, range definitions
├── theme/
│   └── tokens.css              # Japandi design tokens (colors, spacing, typography)
├── hooks/
│   └── useSheetData.ts         # TanStack Query hook wrapping the Sheets API call
├── utils/
│   └── formatCurrency.ts       # formatCurrency(), parseNumber() helpers
├── components/
│   ├── Auth/
│   │   └── AuthGate.tsx        # Login screen with Google OAuth button
│   ├── Nav/
│   │   └── Nav.tsx             # Sidebar (desktop) / bottom nav (mobile)
│   └── BudgetTable/
│       ├── BudgetTable.tsx     # Table container
│       ├── BudgetRow.tsx       # Single budget item row with progress bar
│       ├── CategoryGroup.tsx   # Collapsible category grouping
│       └── ProgressBar.tsx     # Inline progress bar
└── pages/
    ├── Budgets.tsx             # Budget tracking (fully implemented)
    ├── CashFlow.tsx            # Monthly income/expense view (fully implemented)
    ├── Transactions.tsx        # Full transaction ledger with virtual scroll (fully implemented)
    └── Dashboard.tsx           # Placeholder (not yet implemented)
```

---

## Architecture Overview

```
[Google OAuth] → access token → [App.tsx]
                                    │
                               [useSheetData hook]
                                    │
                         Google Sheets API v4 (HTTP GET)
                                    │
                              raw string[][]
                                    │
                          page-level parsing logic
                                    │
                              typed data models
                                    │
                          rendered UI components
```

**Key architectural choices:**
- No backend — all API calls happen from the browser
- Google Sheets is the database; all parsing is done on the frontend
- TanStack Query handles caching, loading states, and re-fetching
- Tokens are stored in `localStorage` with expiry timestamps

---

## Authentication Flow

1. User clicks "Connect Google Account" on `AuthGate`
2. Google OAuth consent opens requesting `spreadsheets.readonly` scope
3. On success: access token + expiry stored in `localStorage`
4. On next load: `AuthGate` attempts silent re-auth (`prompt: 'none'`)
5. `App.tsx` uses a `useEffect` to auto-clear token 60s before expiry
6. Logout clears `localStorage` and resets to `AuthGate`

**Environment variables required:**
```
VITE_GOOGLE_CLIENT_ID=<your OAuth client ID>
VITE_SHEET_ID=<your Google Sheet ID>
```

---

## Google Sheets Data Model

The app reads three named tabs from the user's spreadsheet:

### `BudgetItemized` — Budget page data
| Column | Type | Notes |
|---|---|---|
| Code | string | Format: `FlowType:Item` (e.g., `Outflow:Rent`) |
| Category | string | Grouping label (e.g., "Housing") |
| Budget | number | Total budget amount |
| Type | string | `Monthly` or `Yearly` |
| Budget To Date | number | Pro-rated budget through today |
| Used | number | Amount spent |
| Remaining | number | `Budget To Date - Used` |
| Usage % | number | `Used / Budget To Date * 100` |

### `Itemization` — Transaction data (used by CashFlow + Transactions pages)
| Column | Type | Notes |
|---|---|---|
| Date | string | ISO or `M/YYYY` format |
| Year-Month | string | `YYYY-MM` grouping key |
| Amount | number | Positive = income, negative = expense |
| Code | string | Links to `Categories` sheet |
| Description | string | Optional note |
| Account | string | Account name for filtering |

### `Categories` — Lookup table
| Column | Type | Notes |
|---|---|---|
| Code | string | Unique key matching `Itemization.Code` |
| Item | string | Human-readable name |
| Category | string | Grouping label |
| Type | string | `Inflow`/`Income` or `Outflow`/`Expense` |

---

## Page Summaries

### Budgets (`/budgets`)
- Fetches `BudgetItemized`, groups rows by category
- Color-coded progress bars: sage (< 75%), amber (75–99%), red (≥ 100%)
- Inflow items use inverted logic (red = under target)
- Features: pin items, search, filter by category, drag-to-reorder pinned items
- Pins persisted to `localStorage` under key `budget-pins`

### CashFlow (`/cashflow`)
- Fetches `Itemization` + `Categories`, aggregates by `Year-Month`
- Month navigator with swipe gesture support
- Features: pin items, hide-zero toggle, search, filter by category
- Pins persisted to `localStorage` under key `cashflow-pins`

### Transactions (`/transactions`)
- Fetches `Itemization` + `Categories`, renders full transaction ledger
- **TanStack Virtual** used for efficient rendering of 5000+ rows
- Sticky month headers while scrolling
- Features: full-text search on description, filter by account and category
- Variable row heights: 62px (desktop) / 86px (mobile), 34px for month headers

### Dashboard (`/dashboard`)
- Placeholder only — not yet implemented

---

## Key Hooks & Utilities

### `useSheetData(token, range)`
```typescript
// Returns TanStack Query result for a single Sheets API range
// Enabled only when both token and range are defined
// staleTime: 5 minutes, retry: 1
```

### `formatCurrency(amount, currency?)`
```typescript
// Formats number as USD with no decimal places
// e.g., 1234.56 → "$1,235"
```

### `parseNumber(value)`
```typescript
// Strips non-numeric characters and parses to float
// Handles Google Sheets formatted numbers like "1,234.00"
```

---

## Design System

All tokens defined in `src/theme/tokens.css` as CSS custom properties:

**Colors (Japandi palette):**
```css
--color-sage: #87A878        /* Primary accent, safe progress */
--color-olive: #6B7A3E       /* Active/selected state */
--color-nude: #D4C0A8        /* Background fills */
--color-tan: #B8A898         /* Borders, muted UI */
--color-bg: #F7F4F0          /* App background (warm off-white) */
--color-surface: #FFFFFF     /* Card surfaces */
--color-text: #2D2D2D        /* Primary text */
--color-text-muted: #7A7068  /* Secondary text */
--color-warning: #C9A84C     /* Amber (75–99% budget) */
--color-danger: #B05E5E      /* Muted red (over budget) */
```

**Typography:**
- Body: DM Sans (300/400/500/600)
- Display: Playfair Display (400/600)
- Base: 16px

**Responsive breakpoint:** 768px (mobile = bottom nav, desktop = left sidebar)

---

## Development

```bash
npm install
npm run dev       # Vite dev server at localhost:5173
npm run build     # Production build to /dist
npm run preview   # Preview production build
npm run lint      # ESLint check
```

Copy `.env.example` to `.env` and fill in your Google OAuth client ID and Sheet ID.

---

## Important Implementation Notes

1. **Column parsing is index-based** — pages use `headers.indexOf('column name')` for flexible mapping, so column order in the sheet doesn't matter as long as header names match.

2. **No API server** — all Sheets API requests are made directly from the browser using the user's OAuth token. There's no proxy or backend.

3. **Drag-and-drop** uses the native HTML5 `draggable` attribute, not a library.

4. **PWA caching** caches static assets only; Sheets data is always fetched live (with TanStack Query's 5-minute stale window).

5. **Data is not written** — the app only requests `spreadsheets.readonly` scope. All budget/transaction data must be managed in Google Sheets directly.

6. **Amount sign convention:** In `Itemization`, income is positive and expenses are negative. The CashFlow page uses `Math.abs()` for display but preserves sign for type detection.
