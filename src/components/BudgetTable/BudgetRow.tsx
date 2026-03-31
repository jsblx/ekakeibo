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
          {onPin && (
            <div className={styles.pinBtnWrap}>
              <PinButton pinned={pinned} onPin={onPin} />
            </div>
          )}
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
