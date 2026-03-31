import { SHEET_CONFIG } from '../../config/sheets.js'
import styles from './Nav.module.css'

export type PageId = 'budgets' | 'cashflow' | 'transactions' | 'notes' | 'dashboard'

interface NavItem {
  id: PageId
  label: string
  icon: React.ReactNode
}

interface NavProps {
  activePage: PageId
  onNavigate: (id: PageId) => void
  onLogout: () => void
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'budgets',
    label: 'Budgets',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" />
        <path d="M16 3H8L6 7h12l-2-4z" />
        <circle cx="16" cy="13" r="1.5" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    id: 'cashflow',
    label: 'Cash Flow',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
  },
  {
    id: 'transactions',
    label: 'Transactions',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
        <rect x="9" y="3" width="6" height="4" rx="1" />
        <path d="M9 12h6M9 16h4" />
      </svg>
    ),
  },
  {
    id: 'notes',
    label: 'Notes',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
]

function Nav({ activePage, onNavigate, onLogout }: NavProps) {
  return (
    <nav className={styles.nav}>
      <div className={styles.brand}>
        <img src="/eKakeibo-logo.png" alt="eKakeibo" className={styles.brandLogo} />
      </div>
      <div className={styles.menuGroup}>
        <span className={styles.brandName}>eKakeibo</span>
        <ul className={styles.items}>
        {NAV_ITEMS.map((item) => (
          <li key={item.id}>
            <button
              className={`${styles.navItem} ${activePage === item.id ? styles.active : ''}`}
              onClick={() => onNavigate(item.id)}
              aria-current={activePage === item.id ? 'page' : undefined}
            >
              <span className={styles.icon}>{item.icon}</span>
              <span className={styles.label}>{item.label}</span>
            </button>
          </li>
        ))}
        </ul>
      </div>
      <div className={styles.bottomGroup}>
        <a
          className={styles.sheetLink}
          href={`https://docs.google.com/spreadsheets/d/${SHEET_CONFIG.sheetId}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <span className={styles.icon}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <path d="M10 12h4M10 16h4M10 8h1" />
            </svg>
          </span>
          <span className={styles.label}>View Sheet</span>
        </a>
        <button className={styles.logoutBtn} onClick={onLogout} type="button">
        <span className={styles.icon}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </span>
        <span className={styles.label}>Log out</span>
        </button>
      </div>
    </nav>
  )
}

export default Nav
