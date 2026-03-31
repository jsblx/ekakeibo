import { useState, useMemo, useRef, useEffect } from 'react'
import type { DragEvent } from 'react'

export interface PinningState {
  pinnedOrder: string[]
  pinnedItems: Set<string>
  sortMode: boolean
  dragOverItem: string | null
  togglePin: (key: string) => void
  toggleSortMode: () => void
  handleDragStart: (key: string) => void
  handleDragOver: (e: DragEvent, key: string) => void
  handleDrop: (targetKey: string) => void
  handleDragEnd: () => void
}

export function usePinning(storageKey: string | undefined): PinningState {
  const [pinnedOrder, setPinnedOrder] = useState<string[]>(() => {
    if (!storageKey) return []
    try {
      const parsed = JSON.parse(localStorage.getItem(storageKey) || '[]')
      return Array.isArray(parsed) ? (parsed as string[]) : []
    } catch { return [] }
  })
  const pinnedItems = useMemo(() => new Set(pinnedOrder), [pinnedOrder])
  const [sortMode, setSortMode] = useState(false)
  const [dragOverItem, setDragOverItem] = useState<string | null>(null)
  const dragItem = useRef<string | null>(null)

  useEffect(() => {
    if (!storageKey) return
    localStorage.setItem(storageKey, JSON.stringify(pinnedOrder))
  }, [pinnedOrder, storageKey])

  function togglePin(key: string) {
    if (!storageKey) return
    setPinnedOrder((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    )
  }

  function toggleSortMode() {
    setSortMode((s) => !s)
  }

  function handleDragStart(key: string) {
    dragItem.current = key
  }

  function handleDragOver(e: DragEvent, key: string) {
    e.preventDefault()
    if (dragItem.current !== key) setDragOverItem(key)
  }

  function handleDrop(targetKey: string) {
    const from = dragItem.current
    if (!from || from === targetKey || !storageKey) return
    setPinnedOrder((prev) => {
      const next = [...prev]
      const fromIdx = next.indexOf(from)
      const toIdx = next.indexOf(targetKey)
      if (fromIdx === -1 || toIdx === -1) return prev
      next.splice(fromIdx, 1)
      next.splice(toIdx, 0, from)
      return next
    })
    dragItem.current = null
    setDragOverItem(null)
  }

  function handleDragEnd() {
    dragItem.current = null
    setDragOverItem(null)
  }

  return {
    pinnedOrder,
    pinnedItems,
    sortMode,
    dragOverItem,
    togglePin,
    toggleSortMode,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleDragEnd,
  }
}
