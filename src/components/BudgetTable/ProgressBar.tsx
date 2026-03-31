import styles from './ProgressBar.module.css'

interface ProgressBarProps {
  pct: number
  invert?: boolean
}

function ProgressBar({ pct, invert = false }: ProgressBarProps) {
  const clamped = Math.min(pct, 100)

  const getColorClass = () => {
    if (invert) {
      if (pct >= 100) return styles.sage
      if (pct >= 50)  return styles.warning
      return styles.danger
    }
    if (pct >= 100) return styles.danger
    if (pct >= 75)  return styles.warning
    return styles.sage
  }

  return (
    <div className={styles.track}>
      <div
        className={`${styles.fill} ${getColorClass()}`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}

export default ProgressBar
