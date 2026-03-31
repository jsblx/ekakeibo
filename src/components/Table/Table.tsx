/* src/components/Table/Table.tsx */
import { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import type { ReactNode } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { usePinning } from './usePinning.js'
import styles from './Table.module.css'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pluralize(count: number, singular: string): string {
  return `${count} ${singular}${count !== 1 ? 's' : ''}`
}

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
  renderRow: (item: T, meta: RowMeta) => ReactNode
  rowHeight: number | ((item: T) => number)
  groupHeaderHeight?: number
  storageKey?: string
  columns: string[]
  columnAligns?: ('left' | 'right')[]
  headerGridTemplate?: string
  countLabel?: string
  groupOrder?: 'alpha' | 'insertion'
  renderFooter?: () => ReactNode
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
        <span className={styles.groupCount}>{pluralize(count, countLabel)}</span>
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
        <span className={styles.groupCount}>{pluralize(count, countLabel)}</span>
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
          aria-label={sortMode ? 'Done reordering' : 'Reorder favorites'}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
  columnAligns,
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

  const estimateSize = useCallback(
    (i: number) => {
      const flatItem = flatItems[i]
      if (!flatItem) return 40
      if (flatItem.type === 'group-header') return groupHeaderHeight
      return getRowHeight(flatItem.item)
    },
    [flatItems, groupHeaderHeight, getRowHeight],
  )

  const virtualizer = useVirtualizer({
    count: flatItems.length,
    getScrollElement: () => scrollRef.current,
    estimateSize,
    overscan: 12,
    getItemKey: (i) => {
      const item = flatItems[i]
      if (!item) return i
      return item.type === 'group-header'
        ? `header-${item.label}`
        : `row-${getItemKey(item.item)}`
    },
  })

  // Remeasure when row height changes (e.g. mobile breakpoint)
  const prevRowHeight = useRef(rowHeight)
  useEffect(() => {
    if (prevRowHeight.current !== rowHeight) {
      prevRowHeight.current = rowHeight
      virtualizer.measure()
    }
  }, [rowHeight, virtualizer])

  // ─── Sticky header ───────────────────────────────────────────────────────

  const headerOffsets = useMemo(() => {
    const result: { scrollTop: number; label: string; count: number; summary?: string }[] = []
    let offset = 0
    for (const flatItem of flatItems) {
      if (flatItem.type === 'group-header') {
        result.push({ scrollTop: offset, label: flatItem.label, count: flatItem.count, summary: flatItem.summary })
        offset += groupHeaderHeight
      } else {
        offset += getRowHeight(flatItem.item)
      }
    }
    return result
  }, [flatItems, groupHeaderHeight, getRowHeight])

  const [stickyLabel, setStickyLabel] = useState('')
  const [stickyCount, setStickyCount] = useState(0)
  const [stickySummary, setStickySummary] = useState<string | undefined>(undefined)
  const [showSticky, setShowSticky] = useState(false)

  useEffect(() => {
    setStickyLabel(headerOffsets[0]?.label ?? '')
    setStickyCount(headerOffsets[0]?.count ?? 0)
    setStickySummary(headerOffsets[0]?.summary)
    setShowSticky(false)
  }, [headerOffsets])

  const updateStickyLabel = useCallback(() => {
    const scrollTop = scrollRef.current?.scrollTop ?? 0
    setShowSticky(scrollTop >= groupHeaderHeight)
    let label = headerOffsets[0]?.label ?? ''
    let count = headerOffsets[0]?.count ?? 0
    let summary = headerOffsets[0]?.summary
    for (const entry of headerOffsets) {
      if (entry.scrollTop <= scrollTop + 1) { label = entry.label; count = entry.count; summary = entry.summary }
      else break
    }
    setStickyLabel(label)
    setStickyCount(count)
    setStickySummary(summary)
  }, [headerOffsets, groupHeaderHeight])

  useEffect(() => {
    if (!getGroup) return
    const el = scrollRef.current
    if (!el) return
    el.addEventListener('scroll', updateStickyLabel, { passive: true })
    return () => el.removeEventListener('scroll', updateStickyLabel)
  }, [updateStickyLabel, getGroup])

  // ─── Render ──────────────────────────────────────────────────────────────

  const gridTemplate = headerGridTemplate ?? `repeat(${columns.length}, 1fr)`
  const vItems = virtualizer.getVirtualItems()

  return (
    <div className={styles.table}>
      <div className={styles.tableHeader} style={{ gridTemplateColumns: gridTemplate }}>
        {columns.map((col, i) => (
          <span key={col || `col-${i}`} style={columnAligns ? { textAlign: columnAligns[i] ?? 'left' } : undefined}>{col}</span>
        ))}
      </div>

      {items.length === 0 ? (
        <div className={styles.empty}>No items match this filter.</div>
      ) : (
        <div className={styles.scrollBody} ref={scrollRef}>
          {showSticky && stickyLabel && getGroup && (
            <div className={styles.stickyHeader}>
              <span className={styles.categoryName}>{stickyLabel}</span>
              <div className={styles.groupMeta}>
                <span className={styles.groupCount}>{pluralize(stickyCount, countLabel)}</span>
                {stickySummary && (
                  <>
                    <span className={styles.metaDivider}>·</span>
                    <span className={styles.groupSummary}>{stickySummary}</span>
                  </>
                )}
              </div>
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
                      height: vItem.size,
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
                    style={{ position: 'absolute', top: vItem.start, left: 0, right: 0, height: vItem.size }}
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
                  style={{ position: 'absolute', top: vItem.start, left: 0, right: 0, height: vItem.size }}
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
