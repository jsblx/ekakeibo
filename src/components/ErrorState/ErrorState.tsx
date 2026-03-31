import styles from './ErrorState.module.css'

interface ErrorStateProps {
  message: string
  onRetry: () => void
}

function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className={styles.errorState}>
      <h2 className={styles.errorTitle}>Something went wrong</h2>
      <p className={styles.errorMsg}>{message}</p>
      <button className={styles.retryButton} onClick={onRetry} type="button">
        Try again
      </button>
    </div>
  )
}

export default ErrorState
