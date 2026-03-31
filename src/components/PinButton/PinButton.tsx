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
      aria-label={pinned ? 'Remove from favorites' : 'Add to favorites'}
      aria-pressed={pinned}
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
