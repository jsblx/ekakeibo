import { useState, useMemo, useRef } from 'react'
import { parse, isValid } from 'date-fns'
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

const DATE_FORMATS = [
  'yyyy-MM-dd',   'yyyy/MM/dd',
  'yyyy-MM',      'yyyy/MM',
  'M/d/yyyy',     'MM/dd/yyyy',
  'MM/yyyy',      'MM-yyyy',
  'M/yyyy',       'M-yyyy',
  'MMMM d, yyyy', 'MMMM dd, yyyy',
  'MMM d, yyyy',  'MMM dd, yyyy',
  'd MMMM yyyy',  'dd MMMM yyyy',
  'd MMM yyyy',   'dd MMM yyyy',
  'MMMM yyyy',    'MMM yyyy',
  'yyyy MMMM',    'yyyy MMM',
  'yyyy-MMMM',    'yyyy-MMM',
]
const DATE_REF = new Date(2000, 0, 1)

function normalizeYearMonth(raw: string): string {
  const s = raw.trim()
  if (!s) return ''
  for (const fmt of DATE_FORMATS) {
    const d = parse(s, fmt, DATE_REF)
    if (isValid(d)) {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    }
  }
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
          onRetry={() => refetch()}
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
          columnAligns={['left', 'right']}
          headerGridTemplate="1fr auto"
          renderFooter={renderFooter}
        />
      )}
    </div>
  )
}

export default CashFlow
