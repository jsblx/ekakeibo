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
    () => [...new Set(allRows.map((r) => r.item))].sort(),
    [allRows],
  )

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return allRows.filter((row) => {
      const catMatch = selectedCategories.size === 0 || selectedCategories.has(row.item)
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
    const totalUsed   = filteredRows.reduce((s, r) => s + (r.flowType === 'Inflow' ? Math.abs(r.remaining) : r.used), 0)
    const totalBudget = filteredRows.reduce((s, r) => s + (r.flowType === 'Inflow' ? Math.abs(r.budgetToDate) : r.budgetToDate), 0)
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
          columnAligns={['left', 'left', 'right']}
          headerGridTemplate="1fr auto 140px"
          renderFooter={renderFooter}
        />
      )}
    </div>
  )
}

export default Budgets
