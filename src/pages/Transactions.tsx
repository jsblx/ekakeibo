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
        <>
        <div className={styles.filterBackdrop} onClick={() => setOpen(false)} />
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
        </>
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
    <div className={styles.tableRow}>
      <span className={styles.cellDate}>{tx.dateDisplay}</span>
      <div className={styles.cellDesc}>
        <span className={styles.cellDescDate}>{tx.dateDisplay}</span>
        <span className={styles.cellDescText} title={tx.description}>{toSentenceCase(tx.description)}</span>
        {tx.item && <span className={styles.cellSubtext}>{tx.item}</span>}
      </div>
      <span className={`${styles.cellAmt} ${negative ? styles.amtNegative : positive ? styles.amtPositive : styles.amtZero}`}>
        {positive ? '+' : ''}{formatCurrency(tx.amount)}
      </span>
    </div>
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
          onRetry={() => void refetch()}
        />
      )}

      {!isLoading && !isError && (
        <Table<TransactionRow>
          items={filteredRows}
          getItemKey={(tx) => `${tx.date}-${tx.description}-${tx.amount}`}
          getGroup={(tx) => getMonthLabel(tx.date)}
          renderRow={(tx) => <TxRow tx={tx} />}
          rowHeight={rowHeight}
          columns={isMobile ? ['Description', 'Amount'] : ['Date', 'Description', 'Amount']}
          columnAligns={isMobile ? ['left', 'right'] : ['left', 'left', 'right']}
          headerGridTemplate={isMobile ? '1fr 90px' : '100px 1fr 110px'}
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
