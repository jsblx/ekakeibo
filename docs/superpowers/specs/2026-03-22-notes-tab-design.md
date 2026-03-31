# Notes Tab — Design Spec

**Date:** 2026-03-22
**Status:** Approved

---

## Overview

Add a "Notes" tab to eKakeibo that reads from and writes to a Google Sheet named `Notes`. The sheet has four columns: `Date`, `Description`, `Amount`, `Category`. The page matches the visual style of the Transactions table and introduces a reusable mutation architecture (TanStack Query `useMutation`) with optimistic updates and cache invalidation — the first write-capable feature in the app.

---

## 1. Mutation Infrastructure

### `src/hooks/useSheetMutations.ts`

Two reusable hooks that operate against the same `['sheet', range]` query keys used by `useSheetData`. Both hooks use `useQueryClient()` — the `QueryClientProvider` is already in place via `main.tsx`.

#### `useAppendRow(accessToken, range)`
- `range` is the full data range (e.g. `Notes!A1:D5000`) — used both as the POST URL path **and** as the cache key `['sheet', range]`. Using the same string for both ensures the optimistic update targets the correct cache entry. (The Sheets append API ignores the row bounds and always appends after the last populated row, so passing the full range is safe.)
- Calls `POST https://sheets.googleapis.com/v4/spreadsheets/{id}/values/{range}:append?valueInputOption=USER_ENTERED`
- `onMutate`: saves a snapshot of the current `['sheet', range]` cache, then optimistically appends the new `string[]` row to the **raw `SheetData` (`string[][]`) cache** — never to parsed/sorted data. Display sorting is applied during parsing on top of the raw cache.
- `onError`: rolls back to the saved snapshot
- `onSettled`: invalidates `['sheet', range]` to sync with server

#### `useDeleteRow(accessToken, numericSheetId, range)`
- Signature has three parameters: `accessToken`, `numericSheetId` (the Notes sheet's numeric `gid`), and `range` (used for cache invalidation key `['sheet', range]`)
- Calls `POST https://sheets.googleapis.com/v4/spreadsheets/{id}:batchUpdate` with a `deleteDimension` request using `{ sheetId: numericSheetId, dimension: 'ROWS', startIndex: rowIndex - 1, endIndex: rowIndex }` (0-based, exclusive end)
- `onMutate`: saves a snapshot of `['sheet', range]`, optimistically removes the target row from the raw `string[][]` cache by its raw array index
- `onError`: rolls back to the saved snapshot
- `onSettled`: invalidates `['sheet', range]`

**Delete-lock invariant:** While any delete mutation is in flight, all delete buttons on the page are disabled. This prevents stale `rowIndex` values being used if a user attempts a second delete before `onSettled` refreshes the cache with authoritative server indices.

**`rowIndex` rule:** `rowIndex` is always the 1-based sheet row index assigned during the **pre-sort parse pass** from the raw `string[][]` array position (`i + 1`, where `i` starts at `1` — index `0` is the header row, so the first data row gets `rowIndex = 2`). It must never be derived from the sorted display order.

### `src/config/sheets.ts` changes
1. Update the `SheetConfig` **interface** to add:
   - `tabs.notes: string`
   - `notesSheetId: number`
2. Update the `SHEET_CONFIG` value object to add:
   - `tabs.notes: 'Notes'`
   - `notesSheetId: Number(import.meta.env.VITE_NOTES_SHEET_ID)`

### `.env` / `.env.example` changes
- Add `VITE_NOTES_SHEET_ID=<numeric gid>` — the `gid` value found in the Google Sheets URL (`#gid=XXXXXX`) when viewing the Notes sheet

### OAuth scope — `src/components/Auth/AuthGate.tsx`
- Change scope from `https://www.googleapis.com/auth/spreadsheets.readonly` to `https://www.googleapis.com/auth/spreadsheets`
- Update the disclaimer UI string from `"Read-only access to your spreadsheet only."` to `"Read and write access to your spreadsheet."`

---

## 2. Notes Page

### `src/pages/Notes.tsx`

**Data fetching:**
- `useSheetData(accessToken, \`${SHEET_CONFIG.tabs.notes}!A1:D5000\`)` — reads all note rows
- `useSheetData(accessToken, \`${SHEET_CONFIG.tabs.categories}!A1:D1000\`)` — reads Categories sheet for the Add modal dropdown (same range used in `Transactions.tsx`)

**`NoteRow` interface:**
```ts
interface NoteRow {
  rowIndex: number      // 1-based sheet row index, assigned in pre-sort parse loop
  date: string          // raw string for sorting
  dateDisplay: string   // formatted for display
  description: string
  amount: number
  category: string
}
```

**Parsing:**
- `parseNotes(raw: string[][]): NoteRow[]` — iterates raw data starting at index 1 (skipping header), assigns `rowIndex = i + 1` (where `i` is the loop variable over the raw array), then sorts the result descending by date. `rowIndex` is always set before sorting.

**Mutations:**
- `useAppendRow(accessToken, \`${SHEET_CONFIG.tabs.notes}!A1:D5000\`)` for adds
- `useDeleteRow(accessToken, SHEET_CONFIG.notesSheetId, \`${SHEET_CONFIG.tabs.notes}!A1:D5000\`)` for deletes

**Layout:**
- Page header: title "Notes" on the left, `+ Add` button (sage green) on the right
- Search bar below the header (filters by description, same as Transactions)
- Table with sticky column header
- No virtual scrolling (Notes expected to be a small list; regular overflow scroll)

**Table columns (desktop):**
`Date (100px) | Description (1fr) | Amount (110px) | Category (120px) | Delete (40px)`

Grid: `grid-template-columns: 100px 1fr 110px 120px 40px`

**Table columns (mobile):**
`Description (1fr) | Amount (90px) | Delete (40px)` — Date hidden, shown as subtext on Description cell; Category hidden

**Rows sorted:** descending by date (newest first), matching Transactions behaviour.

### Add Modal

Triggered by `+ Add` button. Fields:

| Field | Input type | Default | Notes |
|---|---|---|---|
| Date | `<input type="date">` | Today's date | Required |
| Description | `<input type="text">` | — | Required |
| Amount | `<input type="number">` | — | Supports negative values; required |
| Category | `<select>` | — | Options from Categories sheet `category` column; required |

- Submit calls `useAppendRow` (range: `` `${SHEET_CONFIG.tabs.notes}!A1:D5000` ``) with `[date, description, String(amount), category]`
- Modal closes on success; shows inline error message on failure (no auto-close)
- While submitting: submit button shows loading state, all inputs disabled

### Delete Confirmation

- Each row has a small delete icon button on the right
- Clicking shows an inline confirmation within the row: `"Delete? · Confirm · Cancel"`
- All other delete buttons are disabled while any delete mutation is in flight (delete-lock)
- Confirming calls `useDeleteRow` with the row's `rowIndex`
- While deleting: row is visually dimmed
- On error: row reappears (rollback), an error message appears in the row and auto-dismisses after 4 seconds

---

## 3. Navigation

### `src/components/Nav/Nav.tsx`
- Expand `PageId` type:
  ```ts
  export type PageId = 'budgets' | 'cashflow' | 'transactions' | 'notes' | 'dashboard'
  ```
- Add to `NAV_ITEMS` array:
  ```ts
  { id: 'notes', label: 'Notes', icon: <notepad SVG> }
  ```

### `src/App.tsx`
- Import `Notes` page
- Add `'notes'` to the `valid` array on the page-param guard (line ~41)
- Add `case 'notes': return <Notes accessToken={accessToken} />` to `renderPage`

---

## 4. File Summary

| File | Change |
|---|---|
| `src/hooks/useSheetMutations.ts` | **New** — `useAppendRow`, `useDeleteRow` |
| `src/pages/Notes.tsx` | **New** — Notes page |
| `src/pages/Notes.module.css` | **New** — Notes page styles |
| `src/config/sheets.ts` | Update `SheetConfig` interface + value: add `tabs.notes`, `notesSheetId` |
| `.env` / `.env.example` | Add `VITE_NOTES_SHEET_ID` |
| `src/components/Nav/Nav.tsx` | Expand `PageId` type; add Notes nav item |
| `src/App.tsx` | Import Notes; add `'notes'` to valid pages; add route case |
| `src/components/Auth/AuthGate.tsx` | Update OAuth scope + disclaimer string |

---

## 5. Out of Scope

- Editing existing note rows (update/patch)
- Sorting or filtering Notes by category/date beyond description search
- Applying optimistic updates to existing pages (Budgets, CashFlow, Transactions) — the infrastructure supports it but no changes are needed to those pages now
