# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start dev server at http://localhost:5173
npm run build      # Production build (outputs to /dist)
npm run lint       # ESLint checks
npm run preview    # Preview production build locally
```

No test framework is currently configured.

## Environment Setup

Copy `.env.example` to `.env` and fill in:

- `VITE_GOOGLE_CLIENT_ID` — Google OAuth 2.0 Client ID (Web application type)
- `VITE_SHEET_ID` — Google Sheet ID used as the database

## Architecture

**Frontend-only PWA.** No backend server. React 19 + TypeScript + Vite, with **Google Sheets API v4 as the database**. Authentication is Google OAuth 2.0 via `@react-oauth/google`. Deployed on Vercel.

### Data Flow

```
App.tsx (manages accessToken in localStorage)
  → useSheetData hook (TanStack Query, 5-min stale time)
    → Google Sheets API v4 (Bearer token)
      → Raw string[][] response
        → Page-level parse functions (parseRows, parseTransactions, etc.)
          → Typed models → Component rendering
```

The sheet schema and column mappings live in `src/config/sheets.ts`.

### Authentication

- Token + expiry stored in `localStorage`
- `AuthGate.tsx` handles silent re-auth on mount
- `App.tsx` auto-clears the token 60s before expiry via `useEffect`
- No token = `AuthGate` renders the Google sign-in button

### Pages

| Page               | Key Features                                                                         |
| ------------------ | ------------------------------------------------------------------------------------ |
| `Budgets.tsx`      | Favorites (localStorage), drag-and-drop reorder, category filter, progress bars      |
| `CashFlow.tsx`     | Month navigation, category grouping, income/expense classification, hide-zero toggle |
| `Transactions.tsx` | Virtual scrolling (`@tanstack/react-virtual`) for large lists, search/filter/sort    |
| `Dashboard.tsx`    | Placeholder — not yet implemented                                                    |

Navigation uses URL query params (`?page=budgets`).

### Styling

- **CSS Modules** for component scoping
- **CSS Custom Properties** defined in `src/theme/tokens.css` — all Japandi design tokens (colors, spacing, typography) live here
- Theme: sage green (`#87A878`), muted tans, clean sans-serif typography

### State Management

- Auth: `useState` in `App.tsx` + `localStorage`
- Server data: TanStack Query (caching, background refetch)
- Favorites/pinning: `localStorage`
- UI state (filters, search, sort): local component state

## Key Files

- `src/config/sheets.ts` — Sheet ID and column mappings
- `src/theme/tokens.css` — All design tokens
- `src/hooks/useSheetData.ts` — TanStack Query wrapper for Sheets API
- `vite.config.ts` — Vite + PWA plugin config
- `CODEBASE.md` — Deeper architecture notes
- `PLAN.md` — Original design specs and color tokens

## AI Strategy

### Reduce context rot through subagents

- Try to split tasks into multiple steps - each with a verifiable checkpoint.
- Take advantage of subagents as much as possible when executing tasks. The main agent should verify the subagent's work.
- If subagents need additional permissions, ask the user.
- By default, these permissions can be scoped within that subagent. If the permissions need to exist for multiple subagents, ask the user for this permission

### Recognize learnings and save context

- Whenever there's a task that is done repeatedly or will be relevant in the context of the repository, ask the user if the user wants to save that context
- Save any learnings as LEARNINGS.md

### Documentation

- Maintain requirements as \*\*/REQUIREMENTS.md
- Create separate sections for functional and non-functional requirements.
- When tasks change requirements, update the REQUIREMENTS.md file/s, depending on the affected scope of that requirement
- When tasks require creating new components, create the corresponding REQUIREMENTS.md file in that component's directory
- By default, trust the user's instruction and accept the requirement change. BUT, if the user's instruction changes too many requirements - confirm this with the user
