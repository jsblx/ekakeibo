# Shared Virtualized Table + Pinning Refactor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace duplicated table/pinning code across Budgets, CashFlow, Transactions, and Notes with a single generic `Table<T>` component that has virtualization, sticky group headers, and optional pinning built in.

**Architecture:** A generic `Table<T>` component (at `src/components/Table/`) wraps `@tanstack/react-virtual`, flattens grouped items into a virtual list, and optionally renders a "Favorites" first group using an internal `usePinning` hook. Three additional shared components (`ErrorState`, `PinButton`, `CategoryDropdown`) eliminate the remaining duplicated UI across pages.

**Tech Stack:** React 19, TypeScript, `@tanstack/react-virtual`, CSS Modules, localStorage

---

## Parallelization Guide

```
Wave 1 (all independent — run Tasks 1, 2, 3, 4 in parallel):
  Task 1 — ErrorState
  Task 2 — PinButton
  Task 3 — CategoryDropdown
  Task 4 — usePinning hook

Wave 2 (needs Task 4):
  Task 5 — Table<T> component

Wave 3 (needs Tasks 1–5, run 6, 7, 8, 9 in parallel):
  Task 6 — Wire Budgets
  Task 7 — Wire CashFlow
  Task 8 — Wire Transactions
  Task 9 — Wire Notes

Wave 4 (needs Tasks 6–9):
  Task 10 — Cleanup
```

---

## File Map

**Create:**
- `src/components/ErrorState/ErrorState.tsx`
- `src/components/ErrorState/ErrorState.module.css`
- `src/components/PinButton/PinButton.tsx`
- `src/components/PinButton/PinButton.module.css`
- `src/components/CategoryDropdown/CategoryDropdown.tsx`
- `src/components/CategoryDropdown/CategoryDropdown.module.css`
- `src/components/Table/usePinning.ts`
- `src/components/Table/Table.tsx`
- `src/components/Table/Table.module.css`

**Modify:**
- `src/components/BudgetTable/BudgetRow.tsx` — swap inline pin button for `<PinButton>`
- `src/pages/Budgets.tsx` — wire to `Table<T>`, use shared components
- `src/pages/CashFlow.tsx` — wire to `Table<T>`, use shared components
- `src/pages/Transactions.tsx` — wire to `Table<T>`, use `ErrorState`
- `src/pages/Notes.tsx` — wire to `Table<T>`, use `ErrorState`

**Delete (Task 10):**
- `src/components/BudgetTable/BudgetTable.tsx`
- `src/components/BudgetTable/BudgetTable.module.css`
- `src/components/BudgetTable/CategoryGroup.tsx`
- `src/components/BudgetTable/CategoryGroup.module.css`

---

## Task 1 — ErrorState component

**Can run in parallel with Tasks 2, 3, 4.**

**Files:**
- Create: `src/components/ErrorState/ErrorState.tsx`
- Create: `src/components/ErrorState/ErrorState.module.css`

- [ ] **Step 1: Create the CSS file**

```css
/* src/components/ErrorState/ErrorState.module.css */
.errorState {
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-12) var(--space-8);
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
}

.errorTitle {
  font-size: 16px;
  font-weight: 500;
  color: var(--color-danger);
}

.errorMsg {
  font-size: 13px;
  color: var(--color-text-muted);
  max-width: 360px;
}

.retryButton {
  margin-top: var(--space-2);
  padding: var(--space-2) var(--space-6);
  background-color: var(--color-sage);
  color: var(--color-surface);
  border: none;
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.retryButton:hover {
  background-color: var(--color-olive);
}
```

- [ ] **Step 2: Create the component**

```tsx
/* src/components/ErrorState/ErrorState.tsx */
import styles from './ErrorState.module.css'

interface ErrorStateProps {
  message: string
  onRetry: () => void
}

function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className={styles.errorState}>
      <p className={styles.errorTitle}>Something went wrong</p>
      <p className={styles.errorMsg}>{message}</p>
      <button className={styles.retryButton} onClick={onRetry} type="button">
        Try again
      </button>
    </div>
  )
}

export default ErrorState
```

- [ ] **Step 3: Type-check**

```bash
cd /Users/joseph.balucan/ME/ekakeibo && npx tsc --noEmit
```

Expected: no errors related to the new files.

- [ ] **Step 4: Commit**

```bash
git add src/components/ErrorState/
git commit -m "feat: add shared ErrorState component"
```

---

## Task 2 — PinButton component

**Can run in parallel with Tasks 1, 3, 4.**

**Files:**
- Create: `src/components/PinButton/PinButton.tsx`
- Create: `src/components/PinButton/PinButton.module.css`

- [ ] **Step 1: Create the CSS file**

```css
/* src/components/PinButton/PinButton.module.css */
.pinBtn {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  padding: 2px;
  cursor: pointer;
  color: var(--color-border);
  opacity: 0;
  transition: opacity 0.15s ease, color 0.15s ease;
}

/* Parent row must expose a hover target. Each row component
   adds: .row:hover .pinBtn { opacity: 1; } in its own CSS. */

.pinBtn:hover {
  color: var(--color-tan);
}

.pinned {
  opacity: 1;
  color: var(--color-tan);
}
```

- [ ] **Step 2: Create the component**

```tsx
/* src/components/PinButton/PinButton.tsx */
import styles from './PinButton.module.css'

interface PinButtonProps {
  pinned: boolean
  onPin: () => void
}

function PinButton({ pinned, onPin }: PinButtonProps) {
  return (
    <button
      className={`${styles.pinBtn} ${pinned ? styles.pinned : ''}`}
      onClick={(e) => { e.stopPropagation(); onPin() }}
      type="button"
      title={pinned ? 'Remove from favorites' : 'Add to favorites'}
    >
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill={pinned ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
      </svg>
    </button>
  )
}

export default PinButton
```

- [ ] **Step 3: Type-check**

```bash
cd /Users/joseph.balucan/ME/ekakeibo && npx tsc --noEmit
```

Expected: no errors related to the new files.

- [ ] **Step 4: Commit**

```bash
git add src/components/PinButton/
git commit -m "feat: add shared PinButton component"
```

---

## Task 3 — CategoryDropdown component

**Can run in parallel with Tasks 1, 2, 4.**

**Files:**
- Create: `src/components/CategoryDropdown/CategoryDropdown.tsx`
- Create: `src/components/CategoryDropdown/CategoryDropdown.module.css`

- [ ] **Step 1: Create the CSS file**

```css
/* src/components/CategoryDropdown/CategoryDropdown.module.css */
.dropdown {
  position: relative;
  flex-shrink: 0;
}

.trigger {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  height: 36px;
  padding: 0 var(--space-3);
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-muted);
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  white-space: nowrap;
  transition: color 0.15s ease, border-color 0.15s ease;
}

.trigger:hover {
  color: var(--color-text);
  border-color: var(--color-tan);
}

.triggerActive {
  color: var(--color-text);
  border-color: var(--color-sage);
}

.badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  font-size: 11px;
  font-weight: 600;
  background-color: var(--color-sage);
  color: var(--color-surface);
  border-radius: var(--radius-full);
}

.menu {
  position: absolute;
  top: calc(100% + var(--space-1));
  right: 0;
  min-width: 270px;
  max-height: 240px;
  overflow-y: auto;
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
  padding: var(--space-1);
  z-index: 10;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.sectionLabel {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-muted);
  padding: var(--space-2) var(--space-2) var(--space-1);
}

.item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  font-size: 13px;
  color: var(--color-text);
  border-radius: var(--radius-sm);
  cursor: pointer;
  user-select: none;
}

.item:hover {
  background-color: var(--color-bg);
}

.item input[type="checkbox"] {
  accent-color: var(--color-sage);
  cursor: pointer;
}

.clearBtn {
  margin-top: var(--space-1);
  padding: var(--space-2) var(--space-3);
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-muted);
  background: none;
  border: none;
  border-top: 1px solid var(--color-border);
  cursor: pointer;
  text-align: left;
  width: 100%;
}

.clearBtn:hover {
  color: var(--color-danger);
}
```

- [ ] **Step 2: Create the component**

```tsx
/* src/components/CategoryDropdown/CategoryDropdown.tsx */
import { useState, useRef, useEffect } from 'react'
import styles from './CategoryDropdown.module.css'

interface CategoryDropdownProps {
  categories: string[]
  selected: Set<string>
  onChange: (next: Set<string>) => void
}

function CategoryDropdown({ categories, selected, onChange }: CategoryDropdownProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  function toggle(cat: string) {
    const next = new Set(selected)
    if (next.has(cat)) next.delete(cat)
    else next.add(cat)
    onChange(next)
  }

  return (
    <div className={styles.dropdown} ref={ref}>
      <button
        className={`${styles.trigger} ${selected.size > 0 ? styles.triggerActive : ''}`}
        onClick={() => setOpen((o) => !o)}
        type="button"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
        </svg>
        Filter
        {selected.size > 0 && <span className={styles.badge}>{selected.size}</span>}
      </button>
      {open && (
        <div className={styles.menu}>
          <div className={styles.sectionLabel}>Category</div>
          {categories.map((cat) => (
            <label key={cat} className={styles.item}>
              <input
                type="checkbox"
                checked={selected.has(cat)}
                onChange={() => toggle(cat)}
              />
              {cat}
            </label>
          ))}
          {selected.size > 0 && (
            <button
              className={styles.clearBtn}
              onClick={() => { onChange(new Set()); setOpen(false) }}
              type="button"
            >
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default CategoryDropdown
```

- [ ] **Step 3: Type-check**

```bash
cd /Users/joseph.balucan/ME/ekakeibo && npx tsc --noEmit
```

Expected: no errors related to the new files.

- [ ] **Step 4: Commit**

```bash
git add src/components/CategoryDropdown/
git commit -m "feat: add shared CategoryDropdown component"
```

---

## Task 4 — usePinning hook

**Can run in parallel with Tasks 1, 2, 3.**

**Files:**
- Create: `src/components/Table/usePinning.ts`

- [ ] **Step 1: Create the hook**

```ts
/* src/components/Table/usePinning.ts */
import { useState, useMemo, useRef } from 'react'
import type { DragEvent } from 'react'

export interface PinningState {
  pinnedOrder: string[]
  pinnedItems: Set<string>
  sortMode: boolean
  dragOverItem: string | null
  togglePin: (key: string) => void
  toggleSortMode: () => void
  handleDragStart: (key: string) => void
  handleDragOver: (e: DragEvent, key: string) => void
  handleDrop: (targetKey: string) => void
  handleDragEnd: () => void
}

export function usePinning(storageKey: string | undefined): PinningState {
  const [pinnedOrder, setPinnedOrder] = useState<string[]>(() => {
    if (!storageKey) return []
    try { return JSON.parse(localStorage.getItem(storageKey) || '[]') as string[] }
    catch { return [] }
  })
  const pinnedItems = useMemo(() => new Set(pinnedOrder), [pinnedOrder])
  const [sortMode, setSortMode] = useState(false)
  const [dragOverItem, setDragOverItem] = useState<string | null>(null)
  const dragItem = useRef<string | null>(null)

  function togglePin(key: string) {
    if (!storageKey) return
    setPinnedOrder((prev) => {
      const next = prev.includes(key)
        ? prev.filter((k) => k !== key)
        : [...prev, key]
      localStorage.setItem(storageKey, JSON.stringify(next))
      return next
    })
  }

  function toggleSortMode() {
    setSortMode((s) => !s)
  }

  function handleDragStart(key: string) {
    dragItem.current = key
  }

  function handleDragOver(e: DragEvent, key: string) {
    e.preventDefault()
    if (dragItem.current !== key) setDragOverItem(key)
  }

  function handleDrop(targetKey: string) {
    const from = dragItem.current
    if (!from || from === targetKey || !storageKey) return
    setPinnedOrder((prev) => {
      const next = [...prev]
      const fromIdx = next.indexOf(from)
      const toIdx = next.indexOf(targetKey)
      if (fromIdx === -1 || toIdx === -1) return prev
      next.splice(fromIdx, 1)
      next.splice(toIdx, 0, from)
      localStorage.setItem(storageKey, JSON.stringify(next))
      return next
    })
    dragItem.current = null
    setDragOverItem(null)
  }

  function handleDragEnd() {
    dragItem.current = null
    setDragOverItem(null)
  }

  return {
    pinnedOrder,
    pinnedItems,
    sortMode,
    dragOverItem,
    togglePin,
    toggleSortMode,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleDragEnd,
  }
}
```

- [ ] **Step 2: Type-check**

```bash
cd /Users/joseph.balucan/ME/ekakeibo && npx tsc --noEmit
```

Expected: no errors related to the new file.

- [ ] **Step 3: Commit**

```bash
git add src/components/Table/usePinning.ts
git commit -m "feat: add usePinning hook"
```

---

## Task 5 — Table\<T\> component

**Depends on Task 4. Start after `usePinning.ts` is committed.**

**Files:**
- Create: `src/components/Table/Table.tsx`
- Create: `src/components/Table/Table.module.css`

- [ ] **Step 1: Create the CSS file**

```css
/* src/components/Table/Table.module.css */
.table {
  background-color: var(--color-surface);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
  border: 1px solid var(--color-border);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.tableHeader {
  display: grid;
  column-gap: var(--space-4);
  padding: 0 var(--space-4);
  height: 36px;
  align-items: center;
  border-bottom: 1px solid var(--color-border);
  background-color: var(--color-bg);
  flex-shrink: 0;
}

.tableHeader span {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-text-muted);
}

.tableHeader span:last-child {
  text-align: right;
}

.scrollBody {
  overflow-y: auto;
  height: min(calc(100vh - 300px), 800px);
  position: relative;
}

.stickyHeader {
  position: sticky;
  top: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--space-4);
  height: 34px;
  background-color: color-mix(in srgb, var(--color-surface) 90%, transparent);
  backdrop-filter: blur(4px);
  border-bottom: 1px solid var(--color-border);
}

.groupHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--space-4);
  height: 34px;
  border-bottom: 1px solid var(--color-border);
  background-color: var(--color-surface);
}

.categoryName {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-muted);
}

.groupMeta {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.groupCount {
  font-size: 11px;
  color: var(--color-text-muted);
  opacity: 0.6;
}

.metaDivider {
  font-size: 11px;
  color: var(--color-text-muted);
  opacity: 0.4;
}

.groupSummary {
  font-size: 11px;
  color: var(--color-text-muted);
  opacity: 0.6;
  font-variant-numeric: tabular-nums;
}

.sortToggle {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  font-size: 11px;
  font-weight: 500;
  color: var(--color-text-muted);
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px var(--space-1);
  border-radius: var(--radius-sm);
  transition: color 0.15s ease;
  margin-left: var(--space-2);
}

.sortToggle:hover {
  color: var(--color-text);
}

.sortToggleActive {
  color: var(--color-sage);
}

.draggableRow {
  user-select: none;
}

.dragOver {
  user-select: none;
  background-color: color-mix(in srgb, var(--color-sage) 10%, transparent);
  border-radius: var(--radius-sm);
}

.footer {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-2);
  padding: var(--space-4) var(--space-6);
  border-top: 1px solid var(--color-border);
  background-color: var(--color-bg);
  font-size: 13px;
  color: var(--color-text-muted);
}

.footer strong {
  color: var(--color-text);
  font-weight: 500;
}

.footerDivider {
  opacity: 0.4;
}

.empty {
  text-align: center;
  padding: var(--space-12);
  color: var(--color-text-muted);
  font-size: 14px;
}

@media (max-width: 768px) {
  .table {
    border-radius: 0;
    border-left: none;
    border-right: none;
    flex: 1;
    min-height: 0;
    overflow: visible;
  }

  .scrollBody {
    flex: 1;
    min-height: 0;
    height: auto;
  }
}
```

- [ ] **Step 2: Create the Table component**

```tsx
/* src/components/Table/Table.tsx */
import { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { usePinning } from './usePinning.js'
import styles from './Table.module.css'

// ─── Types ───────────────────────────────────────────────────────────────────

type FlatItem<T> =
  | { type: 'group-header'; label: string; count: number; summary?: string; isFavorites: boolean }
  | { type: 'row'; item: T; isFavorite: boolean }

export interface RowMeta {
  pinned: boolean
  onPin: () => void
  showDragHandle: boolean
}

export interface TableProps<T> {
  items: T[]
  getItemKey: (item: T) => string
  getGroup?: (item: T) => string
  getGroupSummary?: (items: T[]) => string
  renderRow: (item: T, meta: RowMeta) => React.ReactNode
  rowHeight: number | ((item: T) => number)
  groupHeaderHeight?: number
  storageKey?: string
  columns: string[]
  headerGridTemplate?: string
  countLabel?: string
  groupOrder?: 'alpha' | 'insertion'
  renderFooter?: () => React.ReactNode
}

const DEFAULT_GROUP_HEADER_HEIGHT = 34

// ─── Flat-item builder ────────────────────────────────────────────────────────

function buildFlatItems<T>(
  items: T[],
  getItemKey: (item: T) => string,
  getGroup: ((item: T) => string) | undefined,
  getGroupSummary: ((items: T[]) => string) | undefined,
  groupOrder: 'alpha' | 'insertion',
  pinnedOrder: string[],
  pinnedItems: Set<string>,
  hasPinning: boolean,
): FlatItem<T>[] {
  const result: FlatItem<T>[] = []

  // Favorites group first
  if (hasPinning && pinnedOrder.length > 0) {
    const favoriteItems = pinnedOrder
      .map((key) => items.find((item) => getItemKey(item) === key))
      .filter((item): item is T => item !== undefined)
    if (favoriteItems.length > 0) {
      result.push({
        type: 'group-header',
        label: 'Favorites',
        count: favoriteItems.length,
        summary: getGroupSummary?.(favoriteItems),
        isFavorites: true,
      })
      for (const item of favoriteItems) {
        result.push({ type: 'row', item, isFavorite: true })
      }
    }
  }

  // Non-pinned items
  const nonPinned = hasPinning
    ? items.filter((item) => !pinnedItems.has(getItemKey(item)))
    : items

  if (!getGroup) {
    for (const item of nonPinned) {
      result.push({ type: 'row', item, isFavorite: false })
    }
    return result
  }

  const groups = new Map<string, T[]>()
  for (const item of nonPinned) {
    const label = getGroup(item)
    if (!groups.has(label)) groups.set(label, [])
    groups.get(label)!.push(item)
  }

  const entries = [...groups.entries()]
  if (groupOrder === 'alpha') entries.sort(([a], [b]) => a.localeCompare(b))

  for (const [label, groupItems] of entries) {
    result.push({
      type: 'group-header',
      label,
      count: groupItems.length,
      summary: getGroupSummary?.(groupItems),
      isFavorites: false,
    })
    for (const item of groupItems) {
      result.push({ type: 'row', item, isFavorite: false })
    }
  }

  return result
}

// ─── Group header subcomponents ───────────────────────────────────────────────

function GroupHeader({ label, count, summary, countLabel }: {
  label: string
  count: number
  summary?: string
  countLabel: string
}) {
  return (
    <div className={styles.groupHeader}>
      <span className={styles.categoryName}>{label}</span>
      <div className={styles.groupMeta}>
        <span className={styles.groupCount}>{count} {countLabel}{count !== 1 ? 's' : ''}</span>
        {summary && (
          <>
            <span className={styles.metaDivider}>·</span>
            <span className={styles.groupSummary}>{summary}</span>
          </>
        )}
      </div>
    </div>
  )
}

function FavoritesGroupHeader({ count, summary, sortMode, onToggleSortMode, countLabel }: {
  count: number
  summary?: string
  sortMode: boolean
  onToggleSortMode: () => void
  countLabel: string
}) {
  return (
    <div className={styles.groupHeader}>
      <span className={styles.categoryName}>Favorites</span>
      <div className={styles.groupMeta}>
        <span className={styles.groupCount}>{count} {countLabel}{count !== 1 ? 's' : ''}</span>
        {summary && (
          <>
            <span className={styles.metaDivider}>·</span>
            <span className={styles.groupSummary}>{summary}</span>
          </>
        )}
        <button
          className={`${styles.sortToggle} ${sortMode ? styles.sortToggleActive : ''}`}
          onClick={onToggleSortMode}
          type="button"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 16V4m0 0L3 8m4-4l4 4" />
            <path d="M17 8v12m0 0l4-4m-4 4l-4-4" />
          </svg>
          {sortMode ? 'Done' : 'Reorder'}
        </button>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

function Table<T>({
  items,
  getItemKey,
  getGroup,
  getGroupSummary,
  renderRow,
  rowHeight,
  groupHeaderHeight = DEFAULT_GROUP_HEADER_HEIGHT,
  storageKey,
  columns,
  headerGridTemplate,
  countLabel = 'item',
  groupOrder = 'alpha',
  renderFooter,
}: TableProps<T>) {
  const hasPinning = !!storageKey
  const pinning = usePinning(storageKey)

  const getRowHeight = useCallback(
    (item: T) => (typeof rowHeight === 'function' ? rowHeight(item) : rowHeight),
    [rowHeight],
  )

  const flatItems = useMemo(
    () =>
      buildFlatItems(
        items,
        getItemKey,
        getGroup,
        getGroupSummary,
        groupOrder,
        pinning.pinnedOrder,
        pinning.pinnedItems,
        hasPinning,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, getItemKey, getGroup, getGroupSummary, groupOrder, pinning.pinnedOrder, pinning.pinnedItems, hasPinning],
  )

  const scrollRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: flatItems.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (i) => {
      const flatItem = flatItems[i]
      if (!flatItem) return 40
      if (flatItem.type === 'group-header') return groupHeaderHeight
      return getRowHeight(flatItem.item)
    },
    overscan: 12,
  })

  // Remeasure when row height changes (e.g. mobile breakpoint)
  const prevRowHeight = useRef(rowHeight)
  useEffect(() => {
    if (prevRowHeight.current !== rowHeight) {
      prevRowHeight.current = rowHeight
      virtualizer.measure()
    }
  })

  // ─── Sticky header ───────────────────────────────────────────────────────

  const headerOffsets = useMemo(() => {
    const result: { scrollTop: number; label: string; count: number }[] = []
    let offset = 0
    for (const flatItem of flatItems) {
      if (flatItem.type === 'group-header') {
        result.push({ scrollTop: offset, label: flatItem.label, count: flatItem.count })
        offset += groupHeaderHeight
      } else {
        offset += getRowHeight(flatItem.item)
      }
    }
    return result
  }, [flatItems, groupHeaderHeight, getRowHeight])

  const [stickyLabel, setStickyLabel] = useState('')
  const [stickyCount, setStickyCount] = useState(0)
  const [showSticky, setShowSticky] = useState(false)

  useEffect(() => {
    setStickyLabel(headerOffsets[0]?.label ?? '')
    setStickyCount(headerOffsets[0]?.count ?? 0)
    setShowSticky(false)
  }, [headerOffsets])

  const updateStickyLabel = useCallback(() => {
    const scrollTop = scrollRef.current?.scrollTop ?? 0
    setShowSticky(scrollTop >= groupHeaderHeight)
    let label = headerOffsets[0]?.label ?? ''
    let count = headerOffsets[0]?.count ?? 0
    for (const entry of headerOffsets) {
      if (entry.scrollTop <= scrollTop + 1) { label = entry.label; count = entry.count }
      else break
    }
    setStickyLabel(label)
    setStickyCount(count)
  }, [headerOffsets, groupHeaderHeight])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.addEventListener('scroll', updateStickyLabel, { passive: true })
    return () => el.removeEventListener('scroll', updateStickyLabel)
  }, [updateStickyLabel])

  // ─── Render ──────────────────────────────────────────────────────────────

  const gridTemplate = headerGridTemplate ?? `repeat(${columns.length}, 1fr)`
  const vItems = virtualizer.getVirtualItems()

  return (
    <div className={styles.table}>
      <div className={styles.tableHeader} style={{ gridTemplateColumns: gridTemplate }}>
        {columns.map((col) => <span key={col}>{col}</span>)}
      </div>

      {items.length === 0 ? (
        <div className={styles.empty}>No items match this filter.</div>
      ) : (
        <div className={styles.scrollBody} ref={scrollRef}>
          {showSticky && stickyLabel && getGroup && (
            <div className={styles.stickyHeader}>
              <span className={styles.categoryName}>{stickyLabel}</span>
              <span className={styles.groupCount}>
                {stickyCount} {countLabel}{stickyCount !== 1 ? 's' : ''}
              </span>
            </div>
          )}
          <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
            {vItems.map((vItem) => {
              const flatItem = flatItems[vItem.index]
              if (!flatItem) return null

              if (flatItem.type === 'group-header') {
                return (
                  <div
                    key={vItem.key}
                    style={{
                      position: 'absolute',
                      top: vItem.start,
                      left: 0,
                      right: 0,
                      height: groupHeaderHeight,
                    }}
                  >
                    {flatItem.isFavorites ? (
                      <FavoritesGroupHeader
                        count={flatItem.count}
                        summary={flatItem.summary}
                        sortMode={pinning.sortMode}
                        onToggleSortMode={pinning.toggleSortMode}
                        countLabel={countLabel}
                      />
                    ) : (
                      <GroupHeader
                        label={flatItem.label}
                        count={flatItem.count}
                        summary={flatItem.summary}
                        countLabel={countLabel}
                      />
                    )}
                  </div>
                )
              }

              // Row
              const key = getItemKey(flatItem.item)
              const isFavorite = flatItem.isFavorite
              const showDragHandle = isFavorite && pinning.sortMode
              const isDragOver = pinning.dragOverItem === key

              const rowContent = renderRow(flatItem.item, {
                pinned: isFavorite,
                onPin: () => pinning.togglePin(key),
                showDragHandle,
              })

              if (isFavorite && pinning.sortMode) {
                return (
                  <div
                    key={vItem.key}
                    style={{ position: 'absolute', top: vItem.start, left: 0, right: 0 }}
                    className={isDragOver ? styles.dragOver : styles.draggableRow}
                    draggable
                    onDragStart={() => pinning.handleDragStart(key)}
                    onDragOver={(e) => pinning.handleDragOver(e, key)}
                    onDrop={() => pinning.handleDrop(key)}
                    onDragEnd={pinning.handleDragEnd}
                  >
                    {rowContent}
                  </div>
                )
              }

              return (
                <div
                  key={vItem.key}
                  style={{ position: 'absolute', top: vItem.start, left: 0, right: 0 }}
                >
                  {rowContent}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {renderFooter && <div className={styles.footer}>{renderFooter()}</div>}
    </div>
  )
}

export default Table
```

- [ ] **Step 3: Type-check**

```bash
cd /Users/joseph.balucan/ME/ekakeibo && npx tsc --noEmit
```

Expected: no errors related to the new files.

- [ ] **Step 4: Commit**

```bash
git add src/components/Table/
git commit -m "feat: add generic virtualized Table component with pinning"
```

---

## Task 6 — Wire Budgets page

**Depends on Tasks 1, 2, 3, 5. Run in parallel with Tasks 7, 8, 9.**

**Files:**
- Modify: `src/components/BudgetTable/BudgetRow.tsx`
- Modify: `src/pages/Budgets.tsx`

**Context:** `BudgetRow` currently has an inline pin button. `Budgets.tsx` has its own `CategoryDropdown` definition, a favorites block above the toolbar, and uses `<BudgetTable>`. Both get replaced.

- [ ] **Step 1: Update BudgetRow to use PinButton**

Replace the inline pin button block in `src/components/BudgetTable/BudgetRow.tsx`. The full updated file:

```tsx
/* src/components/BudgetTable/BudgetRow.tsx */
import { formatCurrency } from '../../utils/formatCurrency.js'
import PinButton from '../PinButton/PinButton.js'
import ProgressBar from './ProgressBar.js'
import styles from './BudgetRow.module.css'

export interface BudgetRowData {
  flowType: string
  item: string
  category: string
  budget: number
  type: string
  budgetToDate: number
  used: number
  remaining: number
  usagePct: number
}

interface BudgetRowProps extends BudgetRowData {
  pinned?: boolean
  onPin?: () => void
  showDragHandle?: boolean
}

function BudgetRow({ item, flowType, type, budgetToDate, used, remaining, usagePct, pinned = false, onPin, showDragHandle = false }: BudgetRowProps) {
  const isInflow = flowType === 'Inflow'

  const displayBudget = isInflow ? Math.abs(budgetToDate) : budgetToDate
  const displayUsed   = isInflow ? Math.abs(remaining)   : used
  const displayPct    = isInflow && budgetToDate !== 0
    ? (Math.abs(remaining) / Math.abs(budgetToDate)) * 100
    : (usagePct || 0)

  const getPctClass = () => {
    if (isInflow) {
      if (displayPct >= 100) return styles.pctSafe
      if (displayPct >= 50)  return styles.pctWarning
      return styles.pctDanger
    }
    if (displayPct >= 100) return styles.pctDanger
    if (displayPct >= 75)  return styles.pctWarning
    return styles.pctSafe
  }

  return (
    <div className={styles.row}>
      <div className={styles.rowContent}>
        <div className={styles.left}>
          {showDragHandle && (
            <span className={styles.gripHandle}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                <circle cx="4" cy="2"  r="1.2" /><circle cx="8" cy="2"  r="1.2" />
                <circle cx="4" cy="6"  r="1.2" /><circle cx="8" cy="6"  r="1.2" />
                <circle cx="4" cy="10" r="1.2" /><circle cx="8" cy="10" r="1.2" />
              </svg>
            </span>
          )}
          <span className={styles.itemName}>{item}</span>
        </div>
        <span className={`${styles.typeBadge} ${type === 'Yearly' ? styles.yearly : styles.monthly}`}>
          {type === 'Yearly' ? 'Yearly' : 'Monthly'}
        </span>
        <div className={styles.right}>
          <span className={styles.amounts}>
            {formatCurrency(displayUsed)} <span className={styles.divider}>/</span> {formatCurrency(displayBudget)}
          </span>
          {onPin && <PinButton pinned={pinned} onPin={onPin} />}
        </div>
      </div>
      <div className={styles.progressRow}>
        <ProgressBar pct={displayPct} invert={isInflow} />
        <span className={`${styles.pct} ${getPctClass()}`}>
          {Math.round(displayPct)}%
        </span>
      </div>
    </div>
  )
}

export default BudgetRow
```

Also append to `src/components/BudgetTable/BudgetRow.module.css` — a wrapper div exposes the button for hover targeting (PinButton's `opacity: 0` default requires the parent row to make it visible on hover):

```css
/* Append to BudgetRow.module.css */
.pinBtnWrap {
  display: contents;
}

.row:hover .pinBtnWrap > button {
  opacity: 1;
}
```

And wrap `<PinButton>` in `BudgetRow`:

```tsx
<div className={styles.pinBtnWrap}>
  <PinButton pinned={pinned} onPin={onPin} />
</div>
```

- [ ] **Step 2: Replace Budgets.tsx**

The full updated `src/pages/Budgets.tsx`:

```tsx
import { useState, useMemo } from 'react'
import { useSheetData } from '../hooks/useSheetData.js'
import { SHEET_CONFIG } from '../config/sheets.js'
import { parseNumber, formatCurrency } from '../utils/formatCurrency.js'
import Table, { type RowMeta } from '../components/Table/Table.js'
import BudgetRow, { type BudgetRowData } from '../components/BudgetTable/BudgetRow.js'
import CategoryDropdown from '../components/CategoryDropdown/CategoryDropdown.js'
import ErrorState from '../components/ErrorState/ErrorState.js'
import styles from './Budgets.module.css'

const SKELETON_COUNT = 8
const BUDGET_ROW_HEIGHT = 72  // BudgetRow has two lines: content + progress bar

function SkeletonRow() {
  return (
    <div className={styles.skeletonRow}>
      <div className={`${styles.shimmer} ${styles.skeletonName}`} />
      <div className={`${styles.shimmer} ${styles.skeletonBar}`} />
      <div className={`${styles.shimmer} ${styles.skeletonAmt}`} />
    </div>
  )
}

function parseRows(rawData: string[][]): BudgetRowData[] {
  if (!rawData || rawData.length < 2) return []

  const headers = rawData[0].map((h) => h.trim().toLowerCase())
  const col = (name: string) => headers.indexOf(name.toLowerCase())

  const itemIdx       = col('code')
  const categoryIdx   = col('category')
  const budgetIdx     = col('budget')
  const typeIdx       = col('type')
  const btdIdx        = col('budget to date')
  const usedIdx       = col('used')
  const remainingIdx  = col('remaining')
  const usagePctIdx   = col('usage %')

  return rawData.slice(1)
    .filter((row) => row && row[itemIdx])
    .map((row) => ({
      flowType:     ((row[itemIdx] || '').split(':')[0] || '').trim(),
      item:         (row[itemIdx] || '').split(':').pop()!.trim(),
      category:     row[categoryIdx] || 'Uncategorized',
      budget:       parseNumber(row[budgetIdx]),
      type:         (row[typeIdx] || 'Monthly').trim(),
      budgetToDate: parseNumber(row[btdIdx]),
      used:         parseNumber(row[usedIdx]),
      remaining:    parseNumber(row[remainingIdx]),
      usagePct:     parseNumber(row[usagePctIdx]),
    }))
}

interface BudgetsProps {
  accessToken: string
}

function Budgets({ accessToken }: BudgetsProps) {
  const [selectedCategories, setSelectedCategories] = useState(new Set<string>())
  const [search, setSearch] = useState('')

  const range = `${SHEET_CONFIG.tabs.budgets}!A1:Z1000`
  const { data: rawData, isLoading, isError, error, refetch } = useSheetData(accessToken, range)

  const allRows = useMemo(() => parseRows(rawData ?? []), [rawData])

  const categories = useMemo(
    () => [...new Set(allRows.map((r) => r.category))].sort(),
    [allRows],
  )

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return allRows.filter((row) => {
      const catMatch = selectedCategories.size === 0 || selectedCategories.has(row.category)
      const searchMatch = !q || row.item.toLowerCase().includes(q)
      return catMatch && searchMatch
    })
  }, [allRows, selectedCategories, search])

  function getGroupSummary(items: BudgetRowData[]): string {
    const totalUsed   = items.reduce((s, r) => s + (r.flowType === 'Inflow' ? Math.abs(r.remaining)    : r.used),        0)
    const totalBudget = items.reduce((s, r) => s + (r.flowType === 'Inflow' ? Math.abs(r.budgetToDate) : r.budgetToDate), 0)
    return `${formatCurrency(totalUsed)} / ${formatCurrency(totalBudget)}`
  }

  function renderFooter() {
    const totalItems  = filteredRows.length
    const totalUsed   = filteredRows.reduce((s, r) => s + (r.used || 0), 0)
    const totalBudget = filteredRows.reduce((s, r) => s + (r.budgetToDate || 0), 0)
    const avgPct      = filteredRows.length > 0
      ? filteredRows.reduce((s, r) => s + (r.usagePct || 0), 0) / filteredRows.length
      : 0
    return (
      <>
        <span><strong>{totalItems}</strong> items</span>
        <span className={styles.footerDivider}>·</span>
        <span>Total used <strong>{formatCurrency(totalUsed)} / {formatCurrency(totalBudget)}</strong></span>
        <span className={styles.footerDivider}>·</span>
        <span>Avg <strong>{Math.round(avgPct)}%</strong></span>
      </>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div className={styles.titleGroup}>
          <h1 className={styles.title}>Budgets</h1>
        </div>
      </div>

      <div className={styles.toolbar}>
        <input
          className={styles.searchInput}
          type="search"
          placeholder="Search items…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <CategoryDropdown
          categories={categories}
          selected={selectedCategories}
          onChange={setSelectedCategories}
        />
      </div>

      {isLoading && (
        <div className={styles.skeleton}>
          {Array.from({ length: SKELETON_COUNT }).map((_, i) => <SkeletonRow key={i} />)}
        </div>
      )}

      {isError && (
        <ErrorState
          message={error?.message ?? 'An unexpected error occurred.'}
          onRetry={() => void refetch()}
        />
      )}

      {!isLoading && !isError && (
        <Table<BudgetRowData>
          items={filteredRows}
          getItemKey={(r) => r.item}
          getGroup={(r) => r.category}
          getGroupSummary={getGroupSummary}
          renderRow={(row: BudgetRowData, meta: RowMeta) => (
            <BudgetRow
              {...row}
              pinned={meta.pinned}
              onPin={meta.onPin}
              showDragHandle={meta.showDragHandle}
            />
          )}
          rowHeight={BUDGET_ROW_HEIGHT}
          storageKey="budget-pins"
          columns={['Item', 'Type', 'Used / Budget']}
          headerGridTemplate="1fr auto 140px"
          renderFooter={renderFooter}
        />
      )}
    </div>
  )
}

export default Budgets
```

Also remove the now-unused CSS from `src/pages/Budgets.module.css`. Delete these blocks: `.favorites`, `.favoritesHeader`, `.favoritesLabel`, `.sortToggle`, `.sortToggleActive`, `.favoritesRows`, `.draggableRow`, `.dragOver`, and the `.dropdown*` family (now in CategoryDropdown). Keep: `.page`, `.pageHeader`, `.titleGroup`, `.title`, `.toolbar`, `.searchInput`, `.skeleton*`, `.shimmer*`, `.footerDivider`, and mobile overrides.

- [ ] **Step 3: Verify BUDGET_ROW_HEIGHT is accurate**

Run the dev server and open Budgets. Check that rows are not clipped or have extra whitespace. Measure visually — the row has a content line + progress bar line. If the height is off, adjust the `BUDGET_ROW_HEIGHT` constant in Budgets.tsx and re-check.

```bash
npm run dev
```

Open http://localhost:5173?page=budgets. Verify:
- Rows render without clipping
- Categories group correctly with group headers
- Pin a row — it moves to Favorites group at the top
- Reorder button appears in Favorites header
- Sticky header shows current group name while scrolling
- Un-pin a row — it returns to its category group
- Search and category filter still work

- [ ] **Step 4: Type-check**

```bash
cd /Users/joseph.balucan/ME/ekakeibo && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/BudgetTable/BudgetRow.tsx src/components/BudgetTable/BudgetRow.module.css src/pages/Budgets.tsx src/pages/Budgets.module.css
git commit -m "feat: wire Budgets to shared Table component"
```

---

## Task 7 — Wire CashFlow page

**Depends on Tasks 1, 2, 3, 5. Run in parallel with Tasks 6, 8, 9.**

**Files:**
- Modify: `src/pages/CashFlow.tsx`

**Context:** `CashFlow.tsx` contains its own inline `CategoryGroup`, `CashFlowRow`, a favorites block, duplicated `CategoryDropdown`, and a custom table structure. We keep `CashFlowRow` inline (it's only used here) but replace its inline pin button with `PinButton`, remove the favorites block, and swap the table with `Table<T>`.

- [ ] **Step 1: Update CashFlow.tsx**

The full updated `src/pages/CashFlow.tsx`:

```tsx
import { useState, useMemo, useRef } from 'react'
import { useSheetData } from '../hooks/useSheetData.js'
import { SHEET_CONFIG } from '../config/sheets.js'
import { parseNumber, formatCurrency } from '../utils/formatCurrency.js'
import Table, { type RowMeta } from '../components/Table/Table.js'
import CategoryDropdown from '../components/CategoryDropdown/CategoryDropdown.js'
import ErrorState from '../components/ErrorState/ErrorState.js'
import PinButton from '../components/PinButton/PinButton.js'
import styles from './CashFlow.module.css'

const SKELETON_COUNT = 8
const CASHFLOW_ROW_HEIGHT = 48

function SkeletonRow() {
  return (
    <div className={styles.skeletonRow}>
      <div className={`${styles.shimmer} ${styles.skeletonName}`} />
      <div className={`${styles.shimmer} ${styles.skeletonAmt}`} />
    </div>
  )
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface ItemizationRow {
  yearMonth: string
  amount: number
  code: string
}

interface CategoryInfo {
  code: string
  item: string
  category: string
  type: string
}

interface AggregatedRow {
  code: string
  item: string
  category: string
  type: string
  amount: number
}

// ─── Parsing ──────────────────────────────────────────────────────────────────

function normalizeYearMonth(raw: string): string {
  const s = raw.trim()
  if (!s) return ''
  const isoMatch = s.match(/^(\d{4})[/-](\d{1,2})/)
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}`
  const mdy = s.match(/^(\d{1,2})[/-](\d{4})/)
  if (mdy) return `${mdy[2]}-${mdy[1].padStart(2, '0')}`
  const d = new Date(s)
  if (!isNaN(d.getTime())) return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  return s
}

function parseItemizationRows(rawData: string[][]): ItemizationRow[] {
  if (!rawData || rawData.length < 2) return []
  const headers = rawData[0].map((h) => h.trim().toLowerCase())
  const col = (name: string) => headers.indexOf(name.toLowerCase())
  const yearMonthIdx = col('year-month')
  const amountIdx = col('amount')
  const codeIdx = col('code')
  return rawData.slice(1)
    .filter((row) => row && row[codeIdx])
    .map((row) => ({
      yearMonth: normalizeYearMonth(row[yearMonthIdx] || ''),
      amount: parseNumber(row[amountIdx]),
      code: (row[codeIdx] || '').trim(),
    }))
}

function parseCategoriesRows(rawData: string[][]): CategoryInfo[] {
  if (!rawData || rawData.length < 2) return []
  const headers = rawData[0].map((h) => h.trim().toLowerCase())
  const col = (name: string) => headers.indexOf(name.toLowerCase())
  const codeIdx = col('code')
  const itemIdx = col('item')
  const categoryIdx = col('category')
  const typeIdx = col('type')
  return rawData.slice(1)
    .filter((row) => row && row[codeIdx])
    .map((row) => ({
      code: (row[codeIdx] || '').trim(),
      item: (row[itemIdx] || '').trim(),
      category: (row[categoryIdx] || 'Uncategorized').trim(),
      type: (row[typeIdx] || '').trim(),
    }))
}

function isIncomeType(type: string): boolean {
  const t = type.toLowerCase()
  return t === 'income' || t === 'inflow' || t === 'revenue'
}

// ─── CashFlowRow ──────────────────────────────────────────────────────────────

interface CashFlowRowProps extends AggregatedRow {
  pinned: boolean
  onPin: () => void
  showDragHandle: boolean
}

function CashFlowRow({ item, amount, type, pinned, onPin, showDragHandle }: CashFlowRowProps) {
  const income = isIncomeType(type)
  const zero = amount === 0
  const negative = !income && amount < 0
  return (
    <div className={styles.row}>
      <div className={styles.left}>
        {showDragHandle && (
          <span className={styles.gripHandle}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
              <circle cx="4" cy="2"  r="1.2" /><circle cx="8" cy="2"  r="1.2" />
              <circle cx="4" cy="6"  r="1.2" /><circle cx="8" cy="6"  r="1.2" />
              <circle cx="4" cy="10" r="1.2" /><circle cx="8" cy="10" r="1.2" />
            </svg>
          </span>
        )}
        <span className={styles.itemName}>{item}</span>
      </div>
      <div className={styles.right}>
        <span className={`${styles.amount} ${zero ? styles.amountZero : income ? styles.amountIncome : negative ? styles.amountExpense : ''}`}>
          {income && !zero ? '+' : ''}{formatCurrency(amount)}
        </span>
        <div className={styles.pinBtnWrap}>
          <PinButton pinned={pinned} onPin={onPin} />
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

interface CashFlowProps {
  accessToken: string
}

function CashFlow({ accessToken }: CashFlowProps) {
  const [monthOffset, setMonthOffset] = useState(0)
  const [hideZero, setHideZero] = useState(false)
  const [selectedCategories, setSelectedCategories] = useState(new Set<string>())
  const [search, setSearch] = useState('')
  const touchStartX = useRef<number | null>(null)

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    if (Math.abs(dx) < 50) return
    if (dx > 0) setMonthOffset((o) => o - 1)
    else if (monthOffset < 0) setMonthOffset((o) => o + 1)
    touchStartX.current = null
  }

  const selectedDate = useMemo(() => {
    const d = new Date()
    d.setDate(1)
    d.setMonth(d.getMonth() + monthOffset)
    return d
  }, [monthOffset])

  const monthKey = useMemo(() => {
    return `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}`
  }, [selectedDate])

  const monthLabel = useMemo(() => {
    return selectedDate.toLocaleString('en-US', { month: 'short', year: 'numeric' })
  }, [selectedDate])

  const itemizationRange = `${SHEET_CONFIG.tabs.itemization}!A1:J1000`
  const categoriesRange = `${SHEET_CONFIG.tabs.categories}!A1:D1000`

  const { data: rawItemization, isLoading: loadingItems, isError: errorItems, error: itemError, refetch: refetchItems } =
    useSheetData(accessToken, itemizationRange)
  const { data: rawCategories, isLoading: loadingCats, isError: errorCats, error: catError, refetch: refetchCats } =
    useSheetData(accessToken, categoriesRange)

  const isLoading = loadingItems || loadingCats
  const isError = errorItems || errorCats
  const error = itemError ?? catError

  function refetch() { void refetchItems(); void refetchCats() }

  const itemizationRows = useMemo(() => parseItemizationRows(rawItemization ?? []), [rawItemization])
  const categoriesRows = useMemo(() => parseCategoriesRows(rawCategories ?? []), [rawCategories])

  const availableMonths = useMemo(
    () => [...new Set(itemizationRows.map((r) => r.yearMonth).filter(Boolean))].sort(),
    [itemizationRows],
  )

  const aggregated = useMemo((): AggregatedRow[] => {
    if (!categoriesRows.length) return []
    const amountByCode = new Map<string, number>()
    for (const row of itemizationRows) {
      if (row.yearMonth !== monthKey) continue
      amountByCode.set(row.code, (amountByCode.get(row.code) ?? 0) + row.amount)
    }
    return categoriesRows.map((cat) => ({
      code: cat.code,
      item: cat.item,
      category: cat.category,
      type: cat.type,
      amount: amountByCode.get(cat.code) ?? 0,
    }))
  }, [itemizationRows, categoriesRows, monthKey])

  const categories = useMemo(
    () => [...new Set(aggregated.map((r) => r.item))].sort(),
    [aggregated],
  )

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return aggregated.filter((row) => {
      const catMatch = selectedCategories.size === 0 || selectedCategories.has(row.item)
      const searchMatch = !q || row.item.toLowerCase().includes(q)
      const zeroMatch = !hideZero || row.amount !== 0
      return catMatch && searchMatch && zeroMatch
    })
  }, [aggregated, selectedCategories, search, hideZero])

  function getGroupSummary(items: AggregatedRow[]): string {
    const total = items.reduce((s, r) => s + r.amount, 0)
    const allIncome = items.every((r) => isIncomeType(r.type))
    return `${allIncome && total !== 0 ? '+' : ''}${formatCurrency(total)}`
  }

  function renderFooter() {
    const spending = filteredRows.filter((r) => !isIncomeType(r.type)).reduce((s, r) => s + r.amount, 0)
    const income   = filteredRows.filter((r) =>  isIncomeType(r.type)).reduce((s, r) => s + r.amount, 0)
    return (
      <>
        <span><strong>{filteredRows.length}</strong> items</span>
        <span className={styles.footerDivider}>·</span>
        <span>Spending: <strong>{formatCurrency(spending)}</strong></span>
        <span className={styles.footerDivider}>·</span>
        <span>Income: <strong>{formatCurrency(income)}</strong></span>
      </>
    )
  }

  const isEmpty = !isLoading && !isError && aggregated.length === 0

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div className={styles.titleGroup}>
          <h1 className={styles.title}>Cash Flow</h1>
        </div>
        <div className={styles.monthNav} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
          <button className={styles.monthNavBtn} onClick={() => setMonthOffset((o) => o - 1)} aria-label="Previous month">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <span className={styles.monthLabel}>{monthLabel}</span>
          <button className={styles.monthNavBtn} onClick={() => setMonthOffset((o) => o + 1)} disabled={monthOffset >= 0} aria-label="Next month">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>
      </div>

      <div className={styles.toolbar}>
        <input
          className={styles.searchInput}
          type="search"
          placeholder="Search items…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button
          className={`${styles.hideZeroBtn} ${hideZero ? styles.hideZeroBtnActive : ''}`}
          onClick={() => setHideZero((h) => !h)}
          type="button"
          title={hideZero ? 'Show zeros' : 'Hide zeros'}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {hideZero
              ? <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>
              : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
            }
          </svg>
        </button>
        <CategoryDropdown
          categories={categories}
          selected={selectedCategories}
          onChange={setSelectedCategories}
        />
      </div>

      {isLoading && (
        <div className={styles.skeleton}>
          {Array.from({ length: SKELETON_COUNT }).map((_, i) => <SkeletonRow key={i} />)}
        </div>
      )}

      {isError && (
        <ErrorState
          message={error?.message ?? 'An unexpected error occurred.'}
          onRetry={refetch}
        />
      )}

      {isEmpty && (
        <div className={styles.empty}>
          <p>No data loaded yet.</p>
          {availableMonths.length > 0 && (
            <p className={styles.emptyHint}>Available periods: {availableMonths.slice(-6).join(', ')}</p>
          )}
          {categoriesRows.length === 0 && (
            <p className={styles.emptyHint}>Categories sheet appears empty — check the tab name in config.</p>
          )}
        </div>
      )}

      {!isLoading && !isError && !isEmpty && (
        <Table<AggregatedRow>
          items={filteredRows}
          getItemKey={(r) => r.item}
          getGroup={(r) => r.category}
          getGroupSummary={getGroupSummary}
          renderRow={(row: AggregatedRow, meta: RowMeta) => (
            <CashFlowRow
              {...row}
              pinned={meta.pinned}
              onPin={meta.onPin}
              showDragHandle={meta.showDragHandle}
            />
          )}
          rowHeight={CASHFLOW_ROW_HEIGHT}
          storageKey="cashflow-pins"
          columns={['Item', 'Amount']}
          headerGridTemplate="1fr auto"
          renderFooter={renderFooter}
        />
      )}
    </div>
  )
}

export default CashFlow
```

Also update `src/pages/CashFlow.module.css`: remove the duplicated blocks that are now in shared components — `.favorites`, `.favoritesHeader`, `.favoritesLabel`, `.sortToggle`, `.sortToggleActive`, `.favoritesRows`, `.draggableRow`, `.dragOver`, the `.dropdown*` family, `.group`, `.groupHeader`, `.categoryName`, `.groupMeta`, `.groupCount`, `.metaDivider`, `.groupTotal`, `.rows`, `.table`, `.tableHeader`, `.scrollBody`, `.groups`.

Keep: `.page`, `.pageHeader`, `.titleGroup`, `.title`, `.monthNav*`, `.controls`, `.hideZeroBtn*`, `.toolbar`, `.searchInput`, `.row`, `.left`, `.gripHandle`, `.itemName`, `.right`, `.amount`, `.amountIncome`, `.amountExpense`, `.amountZero`, `.pinBtnWrap`, `.skeleton*`, `.shimmer`, `.footer*`, `.footerDivider`, `.empty`, `.emptyHint`, `.errorState*`, `.retryButton`, and mobile overrides.

Add `.pinBtnWrap` to `CashFlow.module.css`:

```css
.pinBtnWrap {
  display: contents;
}

.row:hover .pinBtnWrap > button {
  opacity: 1;
}
```

- [ ] **Step 2: Verify visually**

```bash
npm run dev
```

Open http://localhost:5173?page=cashflow. Verify:
- Rows render at the correct height with no clipping
- Category groups appear with correct group headers and totals
- Pinning a row moves it to Favorites group
- Reorder works in Favorites group
- Month navigation, hide-zero toggle, search, and category filter all work
- Sticky group header appears when scrolling

- [ ] **Step 3: Type-check**

```bash
cd /Users/joseph.balucan/ME/ekakeibo && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/pages/CashFlow.tsx src/pages/CashFlow.module.css
git commit -m "feat: wire CashFlow to shared Table component"
```

---

## Task 8 — Wire Transactions page

**Depends on Tasks 1 and 5. Run in parallel with Tasks 6, 7, 9.**

**Files:**
- Modify: `src/pages/Transactions.tsx`

**Context:** Transactions has its own virtualizer, custom month-grouping with a sticky header, and no pinning. We replace the custom virtualizer + sticky header logic with `Table<T>`, passing `groupOrder="insertion"` so month groups appear in pre-sorted (descending) order. `TxRow` stays inline and is passed via `renderRow`.

- [ ] **Step 1: Update Transactions.tsx**

The full updated `src/pages/Transactions.tsx`:

```tsx
import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { useSheetData } from '../hooks/useSheetData.js'
import { SHEET_CONFIG } from '../config/sheets.js'
import { parseNumber, formatCurrency } from '../utils/formatCurrency.js'
import Table from '../components/Table/Table.js'
import ErrorState from '../components/ErrorState/ErrorState.js'
import styles from './Transactions.module.css'

// ─── Constants ────────────────────────────────────────────────────────────────

const ROW_HEIGHT_DESKTOP = 62
const ROW_HEIGHT_MOBILE  = 86
const MOBILE_BREAKPOINT  = 768

// ─── Types ────────────────────────────────────────────────────────────────────

interface TransactionRow {
  date: string
  dateDisplay: string
  description: string
  amount: number
  account: string
  code: string
  category: string
  item: string
}

// ─── Parsing ──────────────────────────────────────────────────────────────────

function parseDate(raw: string): Date | null {
  if (!raw) return null
  const d = new Date(raw)
  return isNaN(d.getTime()) ? null : d
}

function formatDateDisplay(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function getMonthLabel(rawDate: string): string {
  const d = parseDate(rawDate)
  if (!d) return 'Unknown'
  return d.toLocaleString('en-US', { month: 'long', year: 'numeric' })
}

function parseTransactions(
  rawItemization: string[][],
  categoryByCode: Map<string, string>,
  itemByCode: Map<string, string>,
): TransactionRow[] {
  if (!rawItemization || rawItemization.length < 2) return []
  const headers = rawItemization[0].map((h) => h.trim().toLowerCase())
  const col = (name: string) => headers.indexOf(name.toLowerCase())

  const dateIdx    = col('date')
  const descIdx    = col('description')
  const amountIdx  = col('amount')
  const accountIdx = col('account')
  const codeIdx    = col('code')

  if (dateIdx === -1 || descIdx === -1 || amountIdx === -1 || codeIdx === -1) {
    console.warn('[Transactions] Missing columns. Found:', headers)
  }

  const rows: TransactionRow[] = []
  for (let i = 1; i < rawItemization.length; i++) {
    const row = rawItemization[i]
    if (!row || !row[descIdx]) continue
    const rawDate = (row[dateIdx] || '').trim()
    const d = parseDate(rawDate)
    const code = (row[codeIdx] || '').trim()
    rows.push({
      date: rawDate,
      dateDisplay: d ? formatDateDisplay(d) : rawDate,
      description: (row[descIdx] || '').trim(),
      amount: parseNumber(row[amountIdx]),
      account: (row[accountIdx] || '').trim(),
      code,
      category: categoryByCode.get(code) ?? 'Uncategorized',
      item: itemByCode.get(code) ?? '',
    })
  }

  rows.sort((a, b) => {
    const da = parseDate(a.date)
    const db = parseDate(b.date)
    if (da && db) return db.getTime() - da.getTime()
    if (da) return -1
    if (db) return 1
    return 0
  })

  return rows
}

function parseCategoryMap(rawCategories: string[][]): Map<string, string> {
  const map = new Map<string, string>()
  if (!rawCategories || rawCategories.length < 2) return map
  const headers = rawCategories[0].map((h) => h.trim().toLowerCase())
  const codeIdx = headers.indexOf('code')
  const catIdx  = headers.indexOf('category')
  if (codeIdx === -1 || catIdx === -1) return map
  for (let i = 1; i < rawCategories.length; i++) {
    const row = rawCategories[i]
    if (!row || !row[codeIdx]) continue
    map.set(row[codeIdx].trim(), (row[catIdx] || 'Uncategorized').trim())
  }
  return map
}

function parseItemMap(rawCategories: string[][]): Map<string, string> {
  const map = new Map<string, string>()
  if (!rawCategories || rawCategories.length < 2) return map
  const headers = rawCategories[0].map((h) => h.trim().toLowerCase())
  const codeIdx = headers.indexOf('code')
  const itemIdx = headers.indexOf('item')
  if (codeIdx === -1 || itemIdx === -1) return map
  for (let i = 1; i < rawCategories.length; i++) {
    const row = rawCategories[i]
    if (!row || !row[codeIdx]) continue
    map.set(row[codeIdx].trim(), (row[itemIdx] || '').trim())
  }
  return map
}

// ─── Filter popover ──────────────────────────────────────────────────────────

interface FilterOption {
  label: string
  value: string
}

interface FilterPopoverProps {
  accounts: FilterOption[]
  categories: FilterOption[]
  selectedAccounts: Set<string>
  selectedCategories: Set<string>
  onChangeAccounts: (next: Set<string>) => void
  onChangeCategories: (next: Set<string>) => void
  activeCount: number
}

function FilterPopover({
  accounts,
  categories,
  selectedAccounts,
  selectedCategories,
  onChangeAccounts,
  onChangeCategories,
  activeCount,
}: FilterPopoverProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  function toggle(set: Set<string>, value: string, onChange: (next: Set<string>) => void) {
    const next = new Set(set)
    if (next.has(value)) next.delete(value)
    else next.add(value)
    onChange(next)
  }

  function clearAll() {
    onChangeAccounts(new Set())
    onChangeCategories(new Set())
  }

  return (
    <div className={styles.filterWrap} ref={ref}>
      <button
        className={`${styles.filterBtn} ${activeCount > 0 ? styles.filterBtnActive : ''}`}
        onClick={() => setOpen((o) => !o)}
        type="button"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
        </svg>
        Filters
        {activeCount > 0 && <span className={styles.filterBadge}>{activeCount}</span>}
      </button>

      {open && (
        <div className={styles.filterPanel}>
          <div className={styles.filterSection}>
            <div className={styles.filterSectionLabel}>Account</div>
            {accounts.map(({ value, label }) => (
              <label key={value} className={styles.filterItem}>
                <input type="checkbox" checked={selectedAccounts.has(value)} onChange={() => toggle(selectedAccounts, value, onChangeAccounts)} />
                {label}
              </label>
            ))}
          </div>
          <div className={styles.filterDivider} />
          <div className={styles.filterSection}>
            <div className={styles.filterSectionLabel}>Category</div>
            {categories.map(({ value, label }) => (
              <label key={value} className={styles.filterItem}>
                <input type="checkbox" checked={selectedCategories.has(value)} onChange={() => toggle(selectedCategories, value, onChangeCategories)} />
                {label}
              </label>
            ))}
          </div>
          {activeCount > 0 && (
            <button className={styles.filterClear} onClick={clearAll} type="button">
              Clear all filters
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── TxRow ────────────────────────────────────────────────────────────────────

function toSentenceCase(str: string): string {
  if (!str) return str
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

function TxRow({ tx }: { tx: TransactionRow }) {
  const negative = tx.amount < 0
  const positive = tx.amount > 0
  return (
    <>
      <span className={styles.cellDate}>{tx.dateDisplay}</span>
      <div className={styles.cellDesc}>
        <span className={styles.cellDescDate}>{tx.dateDisplay}</span>
        <span className={styles.cellDescText} title={tx.description}>{toSentenceCase(tx.description)}</span>
        {tx.item && <span className={styles.cellSubtext}>{tx.item}</span>}
      </div>
      <span className={`${styles.cellAmt} ${negative ? styles.amtNegative : positive ? styles.amtPositive : styles.amtZero}`}>
        {positive ? '+' : ''}{formatCurrency(tx.amount)}
      </span>
    </>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

interface TransactionsProps {
  accessToken: string
}

function Transactions({ accessToken }: TransactionsProps) {
  const [search, setSearch] = useState('')
  const [selectedAccounts, setSelectedAccounts] = useState(new Set<string>())
  const [selectedCategories, setSelectedCategories] = useState(new Set<string>())
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= MOBILE_BREAKPOINT)

  const itemizationRange = `${SHEET_CONFIG.tabs.itemization}!A1:J5000`
  const categoriesRange  = `${SHEET_CONFIG.tabs.categories}!A1:D1000`

  const { data: rawItemization, isLoading: loadingItems, isError: errorItems, error: itemError, refetch: refetchItems } =
    useSheetData(accessToken, itemizationRange)
  const { data: rawCategories, isLoading: loadingCats, isError: errorCats, error: catError, refetch: refetchCats } =
    useSheetData(accessToken, categoriesRange)

  const isLoading = loadingItems || loadingCats
  const isError   = errorItems || errorCats
  const error     = itemError ?? catError

  function refetch() { void refetchItems(); void refetchCats() }

  const categoryByCode = useMemo(() => parseCategoryMap(rawCategories ?? []), [rawCategories])
  const itemByCode = useMemo(() => parseItemMap(rawCategories ?? []), [rawCategories])
  const allRows = useMemo(
    () => parseTransactions(rawItemization ?? [], categoryByCode, itemByCode),
    [rawItemization, categoryByCode, itemByCode],
  )

  const accounts = useMemo((): FilterOption[] => {
    const seen = [...new Set(allRows.map((r) => r.account).filter(Boolean))].sort()
    return seen.map((v) => ({ value: v, label: v }))
  }, [allRows])

  const categories = useMemo((): FilterOption[] => {
    const seen = [...new Set(allRows.map((r) => r.item).filter(Boolean))].sort()
    return seen.map((v) => ({ value: v, label: v }))
  }, [allRows])

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return allRows.filter((row) => {
      const searchMatch   = !q || row.description.toLowerCase().includes(q)
      const accountMatch  = selectedAccounts.size === 0 || selectedAccounts.has(row.account)
      const categoryMatch = selectedCategories.size === 0 || selectedCategories.has(row.item)
      return searchMatch && accountMatch && categoryMatch
    })
  }, [allRows, search, selectedAccounts, selectedCategories])

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const rowHeight = useCallback(
    (_item: TransactionRow) => isMobile ? ROW_HEIGHT_MOBILE : ROW_HEIGHT_DESKTOP,
    [isMobile],
  )

  const activeFilterCount = selectedAccounts.size + selectedCategories.size
  const txCount = filteredRows.length

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div className={styles.titleGroup}>
          <h1 className={styles.title}>Transactions</h1>
        </div>
      </div>

      <div className={styles.toolbar}>
        <input
          className={styles.searchInput}
          type="search"
          placeholder="Search descriptions…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <FilterPopover
          accounts={accounts}
          categories={categories}
          selectedAccounts={selectedAccounts}
          selectedCategories={selectedCategories}
          onChangeAccounts={setSelectedAccounts}
          onChangeCategories={setSelectedCategories}
          activeCount={activeFilterCount}
        />
      </div>

      {isLoading && (
        <div className={styles.skeleton}>
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className={styles.skeletonRow}>
              <div className={`${styles.shimmer} ${styles.skeletonDate}`} />
              <div className={`${styles.shimmer} ${styles.skeletonDesc}`} />
              <div className={`${styles.shimmer} ${styles.skeletonAmt}`} />
            </div>
          ))}
        </div>
      )}

      {isError && (
        <ErrorState
          message={error?.message ?? 'An unexpected error occurred.'}
          onRetry={refetch}
        />
      )}

      {!isLoading && !isError && (
        <Table<TransactionRow>
          items={filteredRows}
          getItemKey={(tx) => `${tx.date}-${tx.description}-${tx.amount}`}
          getGroup={(tx) => getMonthLabel(tx.date)}
          renderRow={(tx) => <TxRow tx={tx} />}
          rowHeight={rowHeight}
          columns={['Date', 'Description', 'Amount']}
          headerGridTemplate="auto 1fr auto"
          countLabel="transaction"
          groupOrder="insertion"
          renderFooter={() => (
            <span>{txCount.toLocaleString()} transaction{txCount !== 1 ? 's' : ''}</span>
          )}
        />
      )}
    </div>
  )
}

export default Transactions
```

- [ ] **Step 2: Verify visually**

```bash
npm run dev
```

Open http://localhost:5173?page=transactions. Verify:
- Transactions render in rows grouped by month in descending order (newest month first)
- Sticky month header appears while scrolling
- Search and account/category filters work
- Mobile layout is correct (check by resizing the browser)

- [ ] **Step 3: Type-check**

```bash
cd /Users/joseph.balucan/ME/ekakeibo && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/pages/Transactions.tsx
git commit -m "feat: wire Transactions to shared Table component"
```

---

## Task 9 — Wire Notes page

**Depends on Tasks 1 and 5. Run in parallel with Tasks 6, 7, 8.**

**Files:**
- Modify: `src/pages/Notes.tsx`

**Context:** Notes is a flat list (no grouping, no pinning). We pass `Table<T>` without `getGroup` or `storageKey`. The `NoteRowItem` component stays inline and is passed via `renderRow`.

- [ ] **Step 1: Update Notes.tsx**

The full updated `src/pages/Notes.tsx`:

```tsx
import { useState, useMemo, useEffect } from 'react'
import { useSheetData } from '../hooks/useSheetData.js'
import { useAppendRow, useDeleteRow } from '../hooks/useSheetMutations.js'
import { SHEET_CONFIG } from '../config/sheets.js'
import { parseNumber, formatCurrency } from '../utils/formatCurrency.js'
import Table from '../components/Table/Table.js'
import ErrorState from '../components/ErrorState/ErrorState.js'
import styles from './Notes.module.css'

const NOTE_ROW_HEIGHT = 56

// ─── Types ────────────────────────────────────────────────────────────────────

interface NoteRow {
  rowIndex: number
  date: string
  dateDisplay: string
  description: string
  amount: number
  category: string
}

// ─── Parsing ──────────────────────────────────────────────────────────────────

function parseDate(raw: string): Date | null {
  if (!raw) return null
  const d = new Date(raw)
  return isNaN(d.getTime()) ? null : d
}

function formatDateDisplay(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function parseNotes(raw: string[][]): NoteRow[] {
  if (!raw || raw.length < 2) return []
  const headers = raw[0].map((h) => h.trim().toLowerCase())
  const col = (name: string) => headers.indexOf(name.toLowerCase())

  const dateIdx = col('date')
  const descIdx = col('description')
  const amtIdx  = col('amount')
  const catIdx  = col('category')

  const rows: NoteRow[] = []
  for (let i = 1; i < raw.length; i++) {
    const row = raw[i]
    if (!row || !row[descIdx]) continue
    const rawDate = (row[dateIdx] || '').trim()
    const d = parseDate(rawDate)
    rows.push({
      rowIndex: i + 1,
      date: rawDate,
      dateDisplay: d ? formatDateDisplay(d) : rawDate,
      description: (row[descIdx] || '').trim(),
      amount: parseNumber(row[amtIdx]),
      category: (row[catIdx] || '').trim(),
    })
  }

  rows.sort((a, b) => {
    const da = parseDate(a.date)
    const db = parseDate(b.date)
    if (da && db) return db.getTime() - da.getTime()
    if (da) return -1
    if (db) return 1
    return 0
  })

  return rows
}

function parseCategoryOptions(rawCategories: string[][]): string[] {
  if (!rawCategories || rawCategories.length < 2) return []
  const headers = rawCategories[0].map((h) => h.trim().toLowerCase())
  const catIdx = headers.indexOf('category')
  if (catIdx === -1) return []
  const seen = new Set<string>()
  for (let i = 1; i < rawCategories.length; i++) {
    const val = rawCategories[i]?.[catIdx]?.trim()
    if (val) seen.add(val)
  }
  return [...seen].sort()
}

// ─── Add Modal ────────────────────────────────────────────────────────────────

interface AddModalProps {
  categories: string[]
  onClose: () => void
  onSubmit: (values: string[]) => void
  isSubmitting: boolean
  submitError: string | null
}

function AddModal({ categories, onClose, onSubmit, isSubmitting, submitError }: AddModalProps) {
  const today = new Date().toISOString().split('T')[0]
  const [date, setDate] = useState(today)
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState(categories[0] ?? '')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit([date, description, amount, category])
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Add Note</h2>
          <button className={styles.modalClose} onClick={onClose} type="button" disabled={isSubmitting}>✕</button>
        </div>
        <form onSubmit={handleSubmit} className={styles.modalForm}>
          <label className={styles.fieldLabel}>
            Date
            <input type="date" className={styles.fieldInput} value={date} onChange={(e) => setDate(e.target.value)} required disabled={isSubmitting} />
          </label>
          <label className={styles.fieldLabel}>
            Description
            <input type="text" className={styles.fieldInput} value={description} onChange={(e) => setDescription(e.target.value)} required disabled={isSubmitting} placeholder="What is this for?" />
          </label>
          <label className={styles.fieldLabel}>
            Amount
            <input type="number" className={styles.fieldInput} value={amount} onChange={(e) => setAmount(e.target.value)} required disabled={isSubmitting} step="0.01" placeholder="0.00" />
          </label>
          <label className={styles.fieldLabel}>
            Category
            <select className={styles.fieldInput} value={category} onChange={(e) => setCategory(e.target.value)} required disabled={isSubmitting}>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          {submitError && <p className={styles.modalError}>{submitError}</p>}
          <div className={styles.modalActions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={isSubmitting}>Cancel</button>
            <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>{isSubmitting ? 'Adding…' : 'Add Note'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── NoteRowItem ──────────────────────────────────────────────────────────────

interface NoteRowItemProps {
  note: NoteRow
  onDelete: (rowIndex: number) => void
  isDeleting: boolean
  deleteError: string | null
  anyDeletingInFlight: boolean
}

function NoteRowItem({ note, onDelete, isDeleting, deleteError, anyDeletingInFlight }: NoteRowItemProps) {
  const [confirming, setConfirming] = useState(false)
  const [errorVisible, setErrorVisible] = useState(false)

  useEffect(() => {
    if (deleteError) {
      setErrorVisible(true)
      const timer = setTimeout(() => setErrorVisible(false), 4000)
      return () => clearTimeout(timer)
    }
  }, [deleteError])

  const negative = note.amount < 0
  const positive = note.amount > 0

  return (
    <div className={`${styles.tableRow} ${isDeleting ? styles.rowDeleting : ''}`}>
      <span className={styles.cellDate}>{note.dateDisplay}</span>
      <div className={styles.cellDesc}>
        <span className={styles.cellDescDate}>{note.dateDisplay}</span>
        <span className={styles.cellDescText} title={note.description}>{note.description}</span>
      </div>
      <span className={`${styles.cellAmt} ${negative ? styles.amtNegative : positive ? styles.amtPositive : styles.amtZero}`}>
        {positive ? '+' : ''}{formatCurrency(note.amount)}
      </span>
      <span className={styles.cellCategory}>{note.category}</span>
      <div className={styles.cellDelete}>
        {confirming ? (
          <span className={styles.deleteConfirm}>
            <span>Delete?</span>
            <span>·</span>
            <button className={styles.confirmYes} onClick={() => { onDelete(note.rowIndex); setConfirming(false) }} disabled={anyDeletingInFlight} type="button">Confirm</button>
            <span>·</span>
            <button className={styles.confirmNo} onClick={() => setConfirming(false)} type="button">Cancel</button>
          </span>
        ) : (
          <button className={styles.deleteBtn} onClick={() => setConfirming(true)} disabled={anyDeletingInFlight} type="button" title="Delete note">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
            </svg>
          </button>
        )}
        {errorVisible && deleteError && <span className={styles.rowError}>{deleteError}</span>}
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

interface NotesProps {
  accessToken: string
}

function Notes({ accessToken }: NotesProps) {
  const [search, setSearch] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [deleteErrors, setDeleteErrors] = useState<Record<number, string>>({})

  const notesRange      = `${SHEET_CONFIG.tabs.notes}!A1:D5000`
  const categoriesRange = `${SHEET_CONFIG.tabs.categories}!A1:D1000`

  const { data: rawNotes, isLoading, isError, error, refetch } = useSheetData(accessToken, notesRange)
  const { data: rawCategories } = useSheetData(accessToken, categoriesRange)

  const appendMutation = useAppendRow(accessToken, notesRange)
  const deleteMutation = useDeleteRow(accessToken, SHEET_CONFIG.notesSheetId, notesRange)

  const notes = useMemo(() => parseNotes(rawNotes ?? []), [rawNotes])
  const categories = useMemo(() => parseCategoryOptions(rawCategories ?? []), [rawCategories])

  const filteredNotes = useMemo(() => {
    const q = search.trim().toLowerCase()
    return q ? notes.filter((n) => n.description.toLowerCase().includes(q)) : notes
  }, [notes, search])

  const anyDeletingInFlight = deleteMutation.isPending
  const deletingRowIndex = deleteMutation.isPending ? deleteMutation.variables?.rowIndex : null

  function handleAdd(values: string[]) {
    appendMutation.mutate({ values }, { onSuccess: () => setShowAddModal(false) })
  }

  function handleDelete(rowIndex: number) {
    setDeleteErrors((prev) => { const next = { ...prev }; delete next[rowIndex]; return next })
    deleteMutation.mutate({ rowIndex }, {
      onError: (err) => setDeleteErrors((prev) => ({ ...prev, [rowIndex]: err.message })),
    })
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.title}>Notes</h1>
        <button className={styles.addButton} onClick={() => setShowAddModal(true)} type="button">+ Add</button>
      </div>

      <div className={styles.toolbar}>
        <input
          className={styles.searchInput}
          type="search"
          placeholder="Search notes…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading && (
        <div className={styles.skeleton}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={styles.skeletonRow}>
              <div className={`${styles.shimmer} ${styles.skeletonDate}`} />
              <div className={`${styles.shimmer} ${styles.skeletonDesc}`} />
              <div className={`${styles.shimmer} ${styles.skeletonAmt}`} />
              <div className={`${styles.shimmer} ${styles.skeletonCategory}`} />
              <div className={`${styles.shimmer} ${styles.skeletonDelete}`} />
            </div>
          ))}
        </div>
      )}

      {isError && (
        <ErrorState
          message={error?.message ?? 'An unexpected error occurred.'}
          onRetry={() => void refetch()}
        />
      )}

      {!isLoading && !isError && (
        <Table<NoteRow>
          items={filteredNotes}
          getItemKey={(n) => String(n.rowIndex)}
          renderRow={(note) => (
            <NoteRowItem
              note={note}
              onDelete={handleDelete}
              isDeleting={deletingRowIndex === note.rowIndex}
              deleteError={deleteErrors[note.rowIndex] ?? null}
              anyDeletingInFlight={anyDeletingInFlight}
            />
          )}
          rowHeight={NOTE_ROW_HEIGHT}
          columns={['Date', 'Description', 'Amount', 'Category', '']}
          headerGridTemplate="auto 1fr auto auto auto"
          renderFooter={() => (
            <span>{filteredNotes.length} note{filteredNotes.length !== 1 ? 's' : ''}</span>
          )}
        />
      )}

      {showAddModal && (
        <AddModal
          categories={categories}
          onClose={() => { if (!appendMutation.isPending) setShowAddModal(false) }}
          onSubmit={handleAdd}
          isSubmitting={appendMutation.isPending}
          submitError={appendMutation.isError ? appendMutation.error?.message ?? 'Failed to add note.' : null}
        />
      )}
    </div>
  )
}

export default Notes
```

- [ ] **Step 2: Verify visually**

```bash
npm run dev
```

Open http://localhost:5173?page=notes. Verify:
- Notes render as a flat list in descending date order (no group headers)
- Search filters correctly
- Delete confirm flow works
- Add modal works

- [ ] **Step 3: Adjust NOTE_ROW_HEIGHT if needed**

If rows are clipped or have excessive whitespace, adjust the `NOTE_ROW_HEIGHT` constant and recheck visually.

- [ ] **Step 4: Type-check**

```bash
cd /Users/joseph.balucan/ME/ekakeibo && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/pages/Notes.tsx
git commit -m "feat: wire Notes to shared Table component"
```

---

## Task 10 — Cleanup

**Depends on Tasks 6, 7, 8, 9 all being complete and verified.**

**Files:**
- Delete: `src/components/BudgetTable/BudgetTable.tsx`
- Delete: `src/components/BudgetTable/BudgetTable.module.css`
- Delete: `src/components/BudgetTable/CategoryGroup.tsx`
- Delete: `src/components/BudgetTable/CategoryGroup.module.css`

- [ ] **Step 1: Confirm no remaining imports**

```bash
grep -r "BudgetTable" src/ --include="*.tsx" --include="*.ts"
grep -r "CategoryGroup" src/ --include="*.tsx" --include="*.ts"
```

Expected: no results. If any imports remain, fix them before deleting.

- [ ] **Step 2: Delete old files**

```bash
rm src/components/BudgetTable/BudgetTable.tsx
rm src/components/BudgetTable/BudgetTable.module.css
rm src/components/BudgetTable/CategoryGroup.tsx
rm src/components/BudgetTable/CategoryGroup.module.css
```

- [ ] **Step 3: Type-check after deletion**

```bash
cd /Users/joseph.balucan/ME/ekakeibo && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Full visual smoke test**

```bash
npm run dev
```

Visit each page and confirm:
- `?page=budgets` — groups, favorites, reorder, search, filter all work
- `?page=cashflow` — groups, favorites, reorder, month nav, hide-zero all work
- `?page=transactions` — month groups in descending order, sticky header, filters work
- `?page=notes` — flat list, add, delete, search all work

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: delete old BudgetTable and CategoryGroup components"
```
