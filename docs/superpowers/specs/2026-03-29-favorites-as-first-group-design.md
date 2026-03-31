# Shared Virtualized Table Component + Pinning Refactor

**Date:** 2026-03-29
**Status:** Approved

## Goal

Introduce a generic `Table<T>` component that all four pages (Budgets, CashFlow, Transactions, Notes) use. It handles virtualized rendering, sticky group headers, and optional pinning (favorites as first group). Eliminate all duplicated table structure, pinning logic, and utility components across pages.

---

## `Table<T>` — Core Design

Located at `src/components/Table/`.

### Props

```ts
interface TableProps<T> {
  items: T[]                               // already-filtered rows from the page
  getItemKey: (item: T) => string          // unique key + pin identifier
  getGroup?: (item: T) => string           // group label; omit for flat (ungrouped) list
  getGroupSummary?: (items: T[]) => string // optional summary shown in group header (e.g. totals)
  renderRow: (item: T, meta: RowMeta) => ReactNode
  rowHeight: number | ((item: T) => number) // fixed number or per-item callback
  groupHeaderHeight?: number               // defaults to 34px
  storageKey?: string                      // enables pinning; omit to disable
  columns: string[]                        // table header labels
  groupOrder?: 'alpha' | 'insertion'       // default 'alpha'; use 'insertion' to preserve item order for groups
  renderFooter?: () => ReactNode
}

interface RowMeta {
  pinned: boolean
  onPin: () => void
  showDragHandle: boolean
}
```

### Virtualization

`Table<T>` uses `@tanstack/react-virtual` internally. It flattens the grouped structure into a `FlatItem[]` array before passing to the virtualizer:

```ts
type FlatItem<T> =
  | { type: 'group-header'; label: string; count: number; summary?: string }
  | { type: 'row'; item: T; groupLabel: string }
```

Variable heights are handled via `estimateSize`: group headers use `groupHeaderHeight`, rows use `rowHeight`.

### Sticky Group Header

A sticky overlay renders above the scroll body, showing the current group name + item count. It appears once the first in-list group header scrolls out of view (same logic as Transactions today). Pages that pass `getGroup` get this for free.

### Grouping Logic

1. If `storageKey` is provided: pull pinned items in `pinnedOrder` sequence → prepend as a `"Favorites"` group
2. Remaining items (or all items if no pinning) → group by `getGroup(item)` → sort groups alphabetically, items within each group alphabetically by key
3. If `getGroup` is omitted: render all items as a flat list with no group headers

### Pinning (optional)

Enabled by passing `storageKey`. Internally uses `usePinning(storageKey)`:
- Owns `pinnedOrder`, `pinnedItems`, `sortMode`, drag handlers, localStorage sync
- Favorites group header includes a "Reorder" toggle button
- Draggable row wrappers applied only to the Favorites group
- No `storageKey` → no pin buttons, no Favorites group

---

## Internal Subcomponents

All live inside `src/components/Table/` and are not exported.

- **`usePinning(storageKey)`** — pin state hook
- **`FavoritesGroupHeader`** — group header with Reorder toggle button
- **`GroupHeader`** — standard group header (name, count, optional summary)

---

## New Shared Components

### `src/components/CategoryDropdown/`

Extracts the identical `CategoryDropdown` duplicated in `Budgets.tsx` and `CashFlow.tsx`.

```ts
interface CategoryDropdownProps {
  categories: string[]
  selected: Set<string>
  onChange: (next: Set<string>) => void
}
```

### `src/components/ErrorState/`

Extracts the near-identical error block in all four pages.

```ts
interface ErrorStateProps {
  message: string
  onRetry: () => void
}
```

### `src/components/PinButton/`

Extracts the bookmark SVG button duplicated in `BudgetRow` and `CashFlowRow`.

```ts
interface PinButtonProps {
  pinned: boolean
  onPin: () => void
}
```

---

## Page Changes

### `Budgets.tsx`
- Remove all pinning state, drag handlers, `pinnedRows` memo, favorites block
- Replace `<BudgetTable>` with `<Table>`:
  - `storageKey="budget-pins"`
  - `getItemKey={r => r.item}`
  - `getGroup={r => r.category}`
  - `getGroupSummary` computes used/budget totals per group
  - `rowHeight` sized to BudgetRow height
- Import `CategoryDropdown` and `ErrorState` from shared locations

### `CashFlow.tsx`
- Remove all pinning state, drag handlers, `pinnedRows` memo, favorites block, inline `CategoryGroup`
- Replace inline table with `<Table>`:
  - `storageKey="cashflow-pins"`
  - `getItemKey={r => r.item}`
  - `getGroup={r => r.category}`
  - `getGroupSummary` computes income/expense totals per group
  - `rowHeight` sized to CashFlowRow height
- Import `CategoryDropdown` and `ErrorState` from shared locations

### `Transactions.tsx`
- Replace custom virtual scroll + inline month-group logic with `<Table>`:
  - No `storageKey` (no pinning)
  - `getItemKey={tx => tx.description + tx.date}` (or similar unique key)
  - `getGroup={tx => getMonthLabel(tx.date)}`
  - `rowHeight` uses existing mobile/desktop values with breakpoint prop or callback
  - Sticky month header handled by Table's built-in sticky group header
- Import `ErrorState` from shared location
- Remove `buildFlatItems`, `headerOffsets`, sticky label state, custom virtualizer setup

### `Notes.tsx`
- Replace inline table with `<Table>`:
  - No `storageKey`, no `getGroup` (flat list)
  - `rowHeight` sized to NoteRowItem height
- Import `ErrorState` from shared location

### `BudgetRow.tsx`
- Import `PinButton` from shared location; remove inline pin button markup

### `CashFlowRow` (currently inline in `CashFlow.tsx`)
- Import `PinButton` from shared location; remove inline pin button markup

---

## Files to Delete After Migration

- `src/components/BudgetTable/BudgetTable.tsx`
- `src/components/BudgetTable/BudgetTable.module.css`
- `src/components/BudgetTable/CategoryGroup.tsx`
- `src/components/BudgetTable/CategoryGroup.module.css`

`BudgetRow.tsx` and `ProgressBar.tsx` stay — page-specific row components.

---

## CSS

- Drag styles (`draggableRow`, `dragOver`, `sortToggle`, `sortToggleActive`) move to `Table/Table.module.css`
- Favorites block styles (`favorites`, `favoritesHeader`, `favoritesLabel`, `favoritesRows`) removed from `Budgets.module.css` and `CashFlow.module.css`
- Custom virtual scroll styles removed from `Transactions.module.css`
- Each new shared component gets its own `.module.css`

---

## Implementation Notes

- `rowHeight` for pages with mobile/desktop breakpoints (Transactions): pass a callback `(item) => isMobile ? ROW_HEIGHT_MOBILE : ROW_HEIGHT_DESKTOP`. The `isMobile` state stays in the page and is captured via closure.
- Notes has no grouping but still benefits from virtualization for potentially large lists.
- Transactions groups are month-based (time order), not alphabetical. Transactions pre-sorts items by date descending (already does this today) and passes `groupOrder="insertion"` so `Table<T>` preserves the order groups are first encountered. `getGroup` returns the display label (e.g. `"March 2026"`) directly.

---

## Out of Scope

- Dashboard (placeholder, no table)
- Loading skeletons — column layouts differ per page; shimmer CSS stays page-local
- Page header components — too much unique right-side content per page
