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

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
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
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
        </svg>
        Filter
        {selected.size > 0 && <span className={styles.badge}>{selected.size}</span>}
      </button>
      {open && (
        <>
        <div className={styles.backdrop} onClick={() => setOpen(false)} />
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
        </>
      )}
    </div>
  )
}

export default CategoryDropdown
