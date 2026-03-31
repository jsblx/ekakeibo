# ekakeibo

A personal finance PWA built with React 19 + TypeScript + Vite, using **Google Sheets as the database**. Tracks budgets, cash flow, and transactions with a Japandi-inspired design.

## Stack

- **Frontend:** React 19, TypeScript, Vite
- **Auth:** Google OAuth 2.0 (`@react-oauth/google`)
- **Database:** Google Sheets API v4
- **State/Data:** TanStack Query
- **Deployment:** Vercel

## Setup

1. Clone the repo and install dependencies:
   ```bash
   yarn
   ```

2. Copy `.env.example` to `.env` and fill in:
   ```
   VITE_GOOGLE_CLIENT_ID=   # Google OAuth 2.0 Client ID (Web application type)
   VITE_SHEET_ID=           # Google Sheet ID used as the database
   ```

3. Start the dev server:
   ```bash
   yarn dev
   ```
   App runs at http://localhost:5173

## Commands

```bash
yarn dev            # Start dev server
yarn build          # Production build (outputs to /dist)
yarn lint           # ESLint checks
yarn preview        # Preview production build locally
yarn deploy         # Deploy preview to Vercel
yarn deploy:prod    # Deploy to production on Vercel
```

## Deployment

The app is deployed on Vercel. It's a static frontend-only PWA — no server-side config needed.

### First-time setup

1. Install the Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Link the project:
   ```bash
   vercel link
   ```

3. Add environment variables to Vercel:
   ```bash
   vercel env add VITE_GOOGLE_CLIENT_ID
   vercel env add VITE_SHEET_ID
   ```
   Set both for **Production**, **Preview**, and **Development** environments.

4. In your Google Cloud Console, add the Vercel deployment URLs (e.g. `https://ekakeibo.vercel.app`) to the **Authorized JavaScript origins** for your OAuth 2.0 Client ID.

### Deploy

```bash
yarn deploy         # Preview deployment
yarn deploy:prod    # Production deployment
```

Or push to `main` — Vercel auto-deploys on every push via the Git integration.

## Pages

| Page           | Description                                                             |
| -------------- | ----------------------------------------------------------------------- |
| Budgets        | Budget progress bars, favorites, drag-and-drop reorder, category filter |
| Cash Flow      | Month navigation, income/expense grouping, hide-zero toggle             |
| Transactions   | Virtual scrolling for large lists, search/filter/sort                   |
| Dashboard      | Placeholder — not yet implemented                                       |

## Architecture

Frontend-only PWA — no backend server. Google Sheets acts as the database, accessed directly from the browser via Bearer token.

See `CLAUDE.md` for deeper architecture notes and `CODEBASE.md` for internals.
