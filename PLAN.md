# Finance Dashboard — App Plan & Specs

## Overview

A Responsive Progressive Web App (PWA) for personal finance tracking, connected to a Google Sheets backend. Minimalist Japandi aesthetic — calm, functional, and clean.

---

## Design System

### Theme: Japandi Minimalist

Inspired by the fusion of Japanese minimalism and Scandinavian functionality. Clean whitespace, organic textures, subtle borders, muted palettes.

### Color Tokens

All colors are defined as CSS custom properties to make future re-theming trivial.

```css
:root {
  /* Primary Palette */
  --color-sage:       #87A878;   /* Sage Green — primary accent */
  --color-olive:      #6B7A3E;   /* Olive Green — active/selected states */
  --color-nude:       #D4C0A8;   /* Warm Nude — backgrounds, cards */
  --color-tan:        #B8A898;   /* Muted Tan — borders, dividers, secondary text */

  /* Neutrals */
  --color-bg:         #F7F4F0;   /* Off-white warm background */
  --color-surface:    #FFFFFF;   /* Card / panel surface */
  --color-text:       #2D2D2D;   /* Primary text */
  --color-text-muted: #7A7068;   /* Secondary / label text */

  /* Semantic */
  --color-positive:   var(--color-sage);
  --color-warning:    #C9A84C;   /* Warm amber for near-limit */
  --color-danger:     #B05E5E;   /* Muted red for over-budget */
  --color-border:     var(--color-tan);
}
```

> To re-theme: update only the `:root` block. No other changes needed.

### Typography

- **Font family:** `'DM Sans'` (body), `'Playfair Display'` (display headings) — both from Google Fonts
- **Base size:** 16px
- **Scale:** 12 / 14 / 16 / 20 / 24 / 32px

### Spacing & Shape

- Spacing scale: 4 / 8 / 12 / 16 / 24 / 32 / 48px
- Border radius: `8px` (cards), `4px` (inputs, chips), `999px` (progress bars, pills)
- Shadows: subtle, warm-toned (`box-shadow: 0 1px 4px rgba(45, 45, 45, 0.08)`)

---

## PWA Configuration

- **Manifest:** app name, theme color (`--color-bg`), icons, `display: standalone`
- **Service Worker:** cache-first for static assets; network-first for Google Sheets API calls
- **Offline state:** show last-cached data with a "last updated" timestamp banner
- **Install prompt:** shown after first meaningful interaction

---

## Google Sheets Integration

### Connection

- Auth via **Google Sheets API v4** with OAuth 2.0 (or a read-only API key for personal use)
- Sheet ID stored in a local config file (`.env` or `config.js`) — not hardcoded
- Data fetched on app load + manual pull-to-refresh

### Sheet Structure

The Google Sheet has the following tabs (mapped to app sections):

| Sheet Tab   | App Section |
|-------------|-------------|
| `Inflow`    | CashFlow (inflow) |
| `Outflow`   | CashFlow (outflow) |
| `Budgets`   | Budgets page |

### Budgets Sheet Columns

| Column | Type | Notes |
|--------|------|-------|
| `Item` | string | Name of the budget line item |
| `Category` | string | Groups items (e.g. Housing, Food, Transport) |
| `Budget` | number | Total allocated budget |
| `Type` | string | `Yearly` or `Monthly` |
| `Budget To Date` | number | Pro-rated budget up to today |
| `Used` | number | Amount spent so far |
| `Remaining` | number | `Budget To Date - Used` |
| `Usage%` | number | `Used / Budget To Date` as a percentage |

---

## App Structure

### Navigation

Three tabs, persistent bottom nav on mobile / left sidebar on desktop:

```
[ Dashboard ]  [ CashFlow ]  [ Budgets ]
```

### Pages

#### 1. Dashboard _(planned, not v1)_
- Summary cards: total inflow, total outflow, net, savings rate
- Sparkline charts for recent trends

#### 2. CashFlow _(planned, not v1)_
- Inflow and Outflow tables
- Monthly breakdown

#### 3. Budgets _(v1 — build this first)_

---

## Budgets Page — Detailed Spec

### Layout

```
[Page Title: Budgets]           [Last synced: Mar 8]

[Category Filter Pills]  [Type Toggle: Monthly | Yearly | All]

┌─────────────────────────────────────────────────────┐
│ HOUSING                                              │
│ Rent           $2,000 / $2,000  ████████████  100%  │
│ Utilities        $180 / $200    ██████████░░   90%  │
├─────────────────────────────────────────────────────┤
│ FOOD                                                 │
│ Groceries        $320 / $400    ████████░░░░   80%  │
│ Dining Out       $210 / $200    █████████████ 105%  │
└─────────────────────────────────────────────────────┘

[Summary Footer: X items · Total used $X / $X · Avg X%]
```

### Budget Table

Each row shows:
- **Item name** (left)
- **Used / Budget To Date** amounts (right of bar)
- **Horizontal progress bar** (color-coded)
- **Usage %** (right-aligned)

Items are **grouped by Category** with a category header row.

### Progress Bar Color Rules

| Usage % | Bar Color |
|---------|-----------|
| 0–74% | `--color-sage` |
| 75–99% | `--color-warning` |
| 100%+ | `--color-danger` |

### Filters

- **Category pills:** "All" + one pill per unique category value in the sheet
- **Type toggle:** All / Monthly / Yearly

### Sorting

Default: grouped by category, sorted by Usage% descending within each group.

### Empty / Loading States

- Loading: skeleton rows (animated shimmer)
- Error: friendly message + retry button
- No data for filter: "No items match this filter"

---

## Tech Stack

| Concern | Choice | Reason |
|---------|--------|--------|
| Framework | **React** (Vite) | Fast DX, PWA plugin available |
| Styling | **CSS Modules** + CSS custom properties | Scoped styles, easy theming |
| Data fetching | **TanStack Query** | Caching, background refetch, offline state |
| Google Sheets | **`googleapis` npm package** | Official SDK |
| PWA | **vite-plugin-pwa** | Zero-config service worker |
| Charts | **Recharts** | Lightweight, composable |
| Deployment | **Vercel** or **Netlify** | Free tier, env var support |

---

## File Structure (Planned)

```
src/
├── config/
│   └── sheets.js          # Sheet ID, tab names, column mappings
├── theme/
│   └── tokens.css         # All CSS custom properties (single source of truth)
├── components/
│   ├── Nav/
│   ├── BudgetTable/
│   │   ├── BudgetTable.jsx
│   │   ├── BudgetRow.jsx
│   │   ├── ProgressBar.jsx
│   │   └── CategoryGroup.jsx
│   └── shared/
│       ├── FilterPills.jsx
│       └── ToggleGroup.jsx
├── pages/
│   ├── Dashboard.jsx
│   ├── CashFlow.jsx
│   └── Budgets.jsx
├── hooks/
│   └── useSheetData.js    # TanStack Query wrapper for Sheets API
└── utils/
    └── formatCurrency.js
```

---

## Build Phases

### Phase 1 — Budgets (current)
- [ ] Project scaffold (Vite + React + PWA plugin)
- [ ] CSS token file with full Japandi palette
- [ ] Google Sheets API connection + `useSheetData` hook
- [ ] Budgets page: table, grouping, progress bars, filters
- [ ] Offline/loading/error states
- [ ] PWA manifest + service worker

### Phase 2 — CashFlow
- [ ] Inflow and Outflow sheet parsing
- [ ] CashFlow page with monthly breakdown

### Phase 3 — Dashboard
- [ ] Summary cards
- [ ] Trend sparklines
- [ ] Net / savings rate calculations

---

## Auth — Google OAuth 2.0

Using OAuth 2.0 so the sheet can remain private.

### Flow

1. On first load, user sees a "Connect Google Account" button
2. Clicking it opens the Google OAuth consent screen (popup or redirect)
3. App requests the `https://www.googleapis.com/auth/spreadsheets.readonly` scope — read-only, minimal permissions
4. Access token is stored in `localStorage` (short-lived); refresh token handled via the OAuth flow
5. On subsequent loads, the token is checked and silently refreshed if needed
6. A "Disconnect" option clears stored tokens

### Implementation

- Use **`@react-oauth/google`** — lightweight wrapper around Google Identity Services (GIS)
- Client ID stored in `.env` as `VITE_GOOGLE_CLIENT_ID`
- Sheet ID stored in `.env` as `VITE_SHEET_ID`
- No backend required — token is used client-side directly against the Sheets API v4

```
.env
├── VITE_GOOGLE_CLIENT_ID=...
└── VITE_SHEET_ID=...
```

> The `.env` file is gitignored. Users cloning the repo supply their own credentials.

### Google Cloud Setup (one-time)

1. Create a project in [Google Cloud Console](https://console.cloud.google.com)
2. Enable the **Google Sheets API**
3. Create an **OAuth 2.0 Client ID** (Web application type)
4. Add the app's origin to "Authorized JavaScript origins" (e.g. `http://localhost:5173`, production URL)
5. Copy the Client ID into `.env`

---

## Open Questions

- Should the app support multiple sheets / profiles in the future?
- Currency format: always USD, or configurable?
