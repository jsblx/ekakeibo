import { useState, useMemo, useEffect, useCallback } from 'react'
import { useSheetData } from '../hooks/useSheetData.js'
import { useAppendRow, useDeleteRow } from '../hooks/useSheetMutations.js'
import { SHEET_CONFIG } from '../config/sheets.js'
import { parseNumber, formatCurrency } from '../utils/formatCurrency.js'
import Table from '../components/Table/Table.js'
import ErrorState from '../components/ErrorState/ErrorState.js'
import styles from './Notes.module.css'

const NOTE_ROW_HEIGHT_DESKTOP = 62
const NOTE_ROW_HEIGHT_MOBILE  = 86
const MOBILE_BREAKPOINT = 768

// ─── Types ────────────────────────────────────────────────────────────────────

interface NoteRow {
  rowIndex: number
  date: string
  dateDisplay: string
  description: string
  amount: number
  category: string
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

function parseNotes(raw: string[][]): NoteRow[] {
  if (!raw || raw.length < 2) return []
  const headers = raw[0].map((h) => h.trim().toLowerCase())
  const col = (name: string) => headers.indexOf(name.toLowerCase())

  const dateIdx = col('date')
  const descIdx = col('description')
  const amtIdx  = col('amount')
  const catIdx  = col('category')

  const rows: NoteRow[] = []
  for (let i = 1; i < raw.length; i++) {
    const row = raw[i]
    if (!row || !row[descIdx]) continue
    const rawDate = (row[dateIdx] || '').trim()
    const d = parseDate(rawDate)
    rows.push({
      rowIndex: i + 1,
      date: rawDate,
      dateDisplay: d ? formatDateDisplay(d) : rawDate,
      description: (row[descIdx] || '').trim(),
      amount: parseNumber(row[amtIdx]),
      category: (row[catIdx] || '').trim(),
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

function parseCategoryOptions(rawCategories: string[][]): string[] {
  if (!rawCategories || rawCategories.length < 2) return []
  const headers = rawCategories[0].map((h) => h.trim().toLowerCase())
  const catIdx = headers.indexOf('category')
  if (catIdx === -1) return []
  const seen = new Set<string>()
  for (let i = 1; i < rawCategories.length; i++) {
    const val = rawCategories[i]?.[catIdx]?.trim()
    if (val) seen.add(val)
  }
  return [...seen].sort()
}

// ─── Add Modal ────────────────────────────────────────────────────────────────

interface AddModalProps {
  categories: string[]
  onClose: () => void
  onSubmit: (values: string[]) => void
  isSubmitting: boolean
  submitError: string | null
}

function AddModal({ categories, onClose, onSubmit, isSubmitting, submitError }: AddModalProps) {
  const today = new Date().toISOString().split('T')[0]
  const [date, setDate] = useState(today)
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [isNegative, setIsNegative] = useState(true)
  const [category, setCategory] = useState(categories[0] ?? '')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const num = parseFloat(amount)
    const signed = isNaN(num) ? amount : String(isNegative ? -Math.abs(num) : Math.abs(num))
    onSubmit([date, description, signed, category])
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Add Note</h2>
          <button className={styles.modalClose} onClick={onClose} type="button" disabled={isSubmitting}>✕</button>
        </div>
        <form onSubmit={handleSubmit} className={styles.modalForm}>
          <label className={styles.fieldLabel}>
            Date
            <input type="date" className={styles.fieldInput} value={date} onChange={(e) => setDate(e.target.value)} required disabled={isSubmitting} />
          </label>
          <label className={styles.fieldLabel}>
            Description
            <input type="text" className={styles.fieldInput} value={description} onChange={(e) => setDescription(e.target.value)} required disabled={isSubmitting} placeholder="What is this for?" />
          </label>
          <label className={styles.fieldLabel}>
            Amount
            <div className={styles.amountRow}>
              <button
                type="button"
                className={`${styles.signToggle} ${isNegative ? styles.signNegative : styles.signPositive}`}
                onClick={() => setIsNegative((v) => !v)}
                disabled={isSubmitting}
                aria-label={isNegative ? 'Switch to positive' : 'Switch to negative'}
              >
                {isNegative ? '−' : '+'}
              </button>
              <input type="number" className={styles.fieldInput} value={amount} onChange={(e) => setAmount(e.target.value)} required disabled={isSubmitting} step="0.01" placeholder="0.00" min="0" />
            </div>
          </label>
          <label className={styles.fieldLabel}>
            Category
            <select className={styles.fieldInput} value={category} onChange={(e) => setCategory(e.target.value)} required disabled={isSubmitting}>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          {submitError && <p className={styles.modalError}>{submitError}</p>}
          <div className={styles.modalActions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={isSubmitting}>Cancel</button>
            <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>{isSubmitting ? 'Adding…' : 'Add Note'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── DeleteModal ─────────────────────────────────────────────────────────────

interface DeleteModalProps {
  note: NoteRow
  onConfirm: () => void
  onCancel: () => void
  isDeleting: boolean
  deleteError: string | null
}

function DeleteModal({ note, onConfirm, onCancel, isDeleting, deleteError }: DeleteModalProps) {
  return (
    <div className={styles.modalOverlay} onClick={onCancel}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Delete Note</h2>
          <button className={styles.modalClose} onClick={onCancel} type="button" disabled={isDeleting}>✕</button>
        </div>
        <div className={styles.deleteModalBody}>
          <p className={styles.deleteModalDesc}>Are you sure you want to delete this note?</p>
          <div className={styles.deleteModalNote}>
            <span className={styles.deleteModalNoteDesc}>{note.description}</span>
            <span className={styles.deleteModalNoteMeta}>{note.dateDisplay} · {note.category}</span>
          </div>
          {deleteError && <p className={styles.modalError}>{deleteError}</p>}
        </div>
        <div className={styles.deleteModalActions}>
          <button type="button" className={styles.cancelBtn} onClick={onCancel} disabled={isDeleting}>Cancel</button>
          <button type="button" className={styles.deleteConfirmBtn} onClick={onConfirm} disabled={isDeleting}>
            {isDeleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── NoteRowItem ──────────────────────────────────────────────────────────────

interface NoteRowItemProps {
  note: NoteRow
  onDeleteRequest: (note: NoteRow) => void
  isDeleting: boolean
}

function NoteRowItem({ note, onDeleteRequest, isDeleting }: NoteRowItemProps) {
  const negative = note.amount < 0
  const positive = note.amount > 0

  return (
    <div className={`${styles.tableRow} ${isDeleting ? styles.rowDeleting : ''}`}>
      <span className={styles.cellDate}>{note.dateDisplay}</span>
      <div className={styles.cellDesc}>
        <span className={styles.cellDescDate}>{note.dateDisplay}</span>
        <span className={styles.cellDescText} title={note.description}>{note.description}</span>
        {note.category && <span className={styles.cellSubtext}>{note.category}</span>}
      </div>
      <span className={`${styles.cellAmt} ${negative ? styles.amtNegative : positive ? styles.amtPositive : styles.amtZero}`}>
        {positive ? '+' : ''}{formatCurrency(note.amount)}
      </span>
      <div className={styles.cellDelete}>
        <button className={styles.deleteBtn} onClick={() => onDeleteRequest(note)} disabled={isDeleting} type="button" title="Delete note">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6M14 11v6" />
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
          </svg>
        </button>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

interface NotesProps {
  accessToken: string
}

function Notes({ accessToken }: NotesProps) {
  const [search, setSearch] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<NoteRow | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= MOBILE_BREAKPOINT)

  const notesRange      = `${SHEET_CONFIG.tabs.notes}!A1:D5000`
  const categoriesRange = `${SHEET_CONFIG.tabs.categories}!A1:D1000`

  const { data: rawNotes, isLoading, isError, error, refetch } = useSheetData(accessToken, notesRange)
  const { data: rawCategories } = useSheetData(accessToken, categoriesRange)

  const appendMutation = useAppendRow(accessToken, notesRange)
  const deleteMutation = useDeleteRow(accessToken, SHEET_CONFIG.tabs.notes, notesRange)

  const notes = useMemo(() => parseNotes(rawNotes ?? []), [rawNotes])
  const categories = useMemo(() => parseCategoryOptions(rawCategories ?? []), [rawCategories])

  const filteredNotes = useMemo(() => {
    const q = search.trim().toLowerCase()
    return q ? notes.filter((n) => n.description.toLowerCase().includes(q)) : notes
  }, [notes, search])

  const deletingRowIndex = deleteMutation.isPending ? deleteMutation.variables?.rowIndex : null

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const rowHeight = useCallback(
    (_item: NoteRow) => isMobile ? NOTE_ROW_HEIGHT_MOBILE : NOTE_ROW_HEIGHT_DESKTOP,
    [isMobile],
  )

  function handleAdd(values: string[]) {
    appendMutation.mutate({ values }, { onSuccess: () => setShowAddModal(false) })
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) return
    setDeleteError(null)
    deleteMutation.mutate({ rowIndex: deleteTarget.rowIndex }, {
      onSuccess: () => setDeleteTarget(null),
      onError: (err) => setDeleteError(err.message),
    })
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.title}>Notes</h1>
        <button className={styles.addButton} onClick={() => setShowAddModal(true)} type="button">+ Add Note</button>
      </div>

      <div className={styles.toolbar}>
        <input
          className={styles.searchInput}
          type="search"
          placeholder="Search notes…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading && (
        <div className={styles.skeleton}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={styles.skeletonRow}>
              <div className={`${styles.shimmer} ${styles.skeletonDate}`} />
              <div className={`${styles.shimmer} ${styles.skeletonDesc}`} />
              <div className={`${styles.shimmer} ${styles.skeletonAmt}`} />
              <div className={`${styles.shimmer} ${styles.skeletonDelete}`} />
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
        <Table<NoteRow>
          items={filteredNotes}
          getItemKey={(n) => String(n.rowIndex)}
          renderRow={(note) => (
            <NoteRowItem
              note={note}
              onDeleteRequest={setDeleteTarget}
              isDeleting={deletingRowIndex === note.rowIndex}
            />
          )}
          rowHeight={rowHeight}
          columns={isMobile ? ['Description', 'Amount', ''] : ['Date', 'Description', 'Amount', '']}
          columnAligns={isMobile ? ['left', 'right', 'left'] : ['left', 'left', 'right', 'left']}
          headerGridTemplate={isMobile ? '1fr 90px 40px' : '100px 1fr 110px 40px'}
          renderFooter={() => (
            <span>{filteredNotes.length} note{filteredNotes.length !== 1 ? 's' : ''}</span>
          )}
        />
      )}

      {showAddModal && (
        <AddModal
          categories={categories}
          onClose={() => { if (!appendMutation.isPending) setShowAddModal(false) }}
          onSubmit={handleAdd}
          isSubmitting={appendMutation.isPending}
          submitError={appendMutation.isError ? appendMutation.error?.message ?? 'Failed to add note.' : null}
        />
      )}

      {deleteTarget && (
        <DeleteModal
          note={deleteTarget}
          onConfirm={handleDeleteConfirm}
          onCancel={() => { if (!deleteMutation.isPending) { setDeleteTarget(null); setDeleteError(null) } }}
          isDeleting={deleteMutation.isPending}
          deleteError={deleteError}
        />
      )}
    </div>
  )
}

export default Notes
