import { useState, useEffect, useRef } from 'react'
import AuthGate from './components/Auth/AuthGate.js'
import Nav, { type PageId } from './components/Nav/Nav.js'
import Budgets from './pages/Budgets.js'
import Dashboard from './pages/Dashboard.js'
import CashFlow from './pages/CashFlow.js'
import Transactions from './pages/Transactions.js'
import Notes from './pages/Notes.js'
import styles from './App.module.css'

const TOKEN_KEY  = 'gauth_token'
const EXPIRY_KEY = 'gauth_expiry'
const PAGE_ORDER: PageId[] = ['budgets', 'cashflow', 'transactions', 'notes', 'dashboard']
const PUSH_DURATION = 300

function loadStoredToken(): string | null {
  try {
    const token  = sessionStorage.getItem(TOKEN_KEY)
    const expiry = Number(sessionStorage.getItem(EXPIRY_KEY) ?? 0)
    if (token && Date.now() < expiry) return token
  } catch { /* ignore */ }
  return null
}

function saveToken(token: string, expiresIn: number) {
  try {
    sessionStorage.setItem(TOKEN_KEY,  token)
    sessionStorage.setItem(EXPIRY_KEY, String(Date.now() + (expiresIn - 60) * 1000))
  } catch { /* ignore */ }
}

function clearToken() {
  try {
    sessionStorage.removeItem(TOKEN_KEY)
    sessionStorage.removeItem(EXPIRY_KEY)
  } catch { /* ignore */ }
}

function LogoutModal({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className={styles.modalOverlay} onClick={onCancel}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Log out</h2>
        </div>
        <p className={styles.modalBody}>Are you sure you want to log out?</p>
        <div className={styles.modalActions}>
          <button className={styles.cancelBtn} onClick={onCancel} type="button">Cancel</button>
          <button className={styles.confirmBtn} onClick={onConfirm} type="button">Log out</button>
        </div>
      </div>
    </div>
  )
}

function App() {
  const [accessToken, setAccessToken] = useState<string | null>(loadStoredToken)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [activePage, setActivePage] = useState<PageId>(() => {
    const param = new URLSearchParams(window.location.search).get('page') as PageId
    return PAGE_ORDER.includes(param) ? param : 'budgets'
  })
  const [exitingPage, setExitingPage] = useState<PageId | null>(null)
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768)
  const navDirection = useRef<'forward' | 'backward'>('forward')
  const transitionTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    return () => { if (transitionTimer.current) clearTimeout(transitionTimer.current) }
  }, [])

  // Auto-expire the token in-session when its TTL runs out
  useEffect(() => {
    if (!accessToken) return
    const expiry = Number(sessionStorage.getItem(EXPIRY_KEY) ?? 0)
    const remaining = expiry - Date.now()
    if (remaining <= 0) { setAccessToken(null); return }
    const timer = setTimeout(() => { clearToken(); setAccessToken(null) }, remaining)
    return () => clearTimeout(timer)
  }, [accessToken])

  function handleLogin(token: string, expiresIn: number) {
    saveToken(token, expiresIn)
    setAccessToken(token)
  }

  function handleNavigate(page: PageId) {
    if (page === activePage) return
    navDirection.current = PAGE_ORDER.indexOf(page) >= PAGE_ORDER.indexOf(activePage) ? 'forward' : 'backward'
    const url = new URL(window.location.href)
    url.searchParams.set('page', page)
    history.replaceState({}, '', url)

    if (isMobile) {
      if (transitionTimer.current) clearTimeout(transitionTimer.current)
      setExitingPage(activePage)
      setActivePage(page)
      transitionTimer.current = setTimeout(() => setExitingPage(null), PUSH_DURATION)
    } else {
      setActivePage(page)
    }
  }

  function handleLogout() {
    setShowLogoutConfirm(true)
  }

  function handleLogoutConfirm() {
    clearToken()
    setAccessToken(null)
    setShowLogoutConfirm(false)
  }

  if (!accessToken) {
    return <AuthGate onLogin={handleLogin} />
  }

  const renderPageContent = (pageId: PageId) => {
    switch (pageId) {
      case 'budgets':      return <Budgets accessToken={accessToken} />
      case 'dashboard':    return <Dashboard />
      case 'cashflow':     return <CashFlow accessToken={accessToken} />
      case 'transactions': return <Transactions accessToken={accessToken} />
      case 'notes':        return <Notes accessToken={accessToken} />
    }
  }

  const showPush = isMobile && exitingPage
  const isForward = navDirection.current === 'forward'

  return (
    <div className={styles.shell}>
      <Nav activePage={activePage} onNavigate={handleNavigate} onLogout={handleLogout} />
      {showLogoutConfirm && (
        <LogoutModal onConfirm={handleLogoutConfirm} onCancel={() => setShowLogoutConfirm(false)} />
      )}
      <main className={styles.content}>
        <div key={activePage} className={styles.pageWrapper}>
          {renderPageContent(activePage)}
        </div>
        {showPush && (
          <div className={styles.pushOverlay}>
            <div className={`${styles.pushSlider} ${isForward ? styles.pushForward : styles.pushBackward}`}>
              {isForward ? (
                <>
                  <div className={styles.pushSide}>{renderPageContent(exitingPage)}</div>
                  <div className={styles.pushSide}>{renderPageContent(activePage)}</div>
                </>
              ) : (
                <>
                  <div className={styles.pushSide}>{renderPageContent(activePage)}</div>
                  <div className={styles.pushSide}>{renderPageContent(exitingPage)}</div>
                </>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
