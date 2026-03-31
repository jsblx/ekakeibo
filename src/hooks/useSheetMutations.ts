import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { SheetData } from './useSheetData.js'
import { SHEET_CONFIG } from '../config/sheets.js'

// ─── Append Row ──────────────────────────────────────────────────────────────

interface AppendRowVariables {
  values: string[]
}

/**
 * Appends a row to the given sheet range.
 * `range` must match exactly what was passed to useSheetData — it is used
 * both as the POST URL path AND as the cache key ['sheet', range].
 */
export function useAppendRow(accessToken: string | null, range: string) {
  const queryClient = useQueryClient()
  const queryKey = ['sheet', range]

  return useMutation<void, Error, AppendRowVariables, { snapshot?: SheetData }>({
    mutationFn: async ({ values }) => {
      const url =
        `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_CONFIG.sheetId}` +
        `/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values: [values] }),
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({})) as { error?: { message?: string } }
        throw new Error(err?.error?.message ?? `Failed to append row: ${response.status}`)
      }
    },

    onMutate: async ({ values }) => {
      await queryClient.cancelQueries({ queryKey })
      const snapshot = queryClient.getQueryData<SheetData>(queryKey)
      queryClient.setQueryData<SheetData>(queryKey, (old) => {
        if (!old) return old
        return [...old, values]
      })
      return { snapshot }
    },

    onError: (_err, _vars, context) => {
      if (context?.snapshot !== undefined) {
        queryClient.setQueryData(queryKey, context.snapshot)
      }
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey })
    },
  })
}

// ─── Delete Row ──────────────────────────────────────────────────────────────

interface DeleteRowVariables {
  rowIndex: number // 1-based sheet row index (header = 1, first data row = 2)
}

async function resolveSheetId(accessToken: string, tabName: string): Promise<number> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_CONFIG.sheetId}?fields=sheets.properties`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })
  if (!res.ok) throw new Error(`Failed to fetch spreadsheet metadata: ${res.status}`)
  const data = await res.json() as { sheets: { properties: { sheetId: number; title: string } }[] }
  const sheet = data.sheets?.find((s) => s.properties?.title === tabName)
  if (!sheet) throw new Error(`Tab "${tabName}" not found in spreadsheet`)
  return sheet.properties.sheetId
}

/**
 * Deletes a single row from the sheet by its 1-based row index.
 * `tabName` is the sheet tab title (e.g. "Notes") — the numeric gid is resolved automatically.
 * `range` must match what was passed to useSheetData for cache key alignment.
 */
export function useDeleteRow(
  accessToken: string | null,
  tabName: string,
  range: string,
) {
  const queryClient = useQueryClient()
  const queryKey = ['sheet', range]

  return useMutation<void, Error, DeleteRowVariables, { snapshot?: SheetData }>({
    mutationFn: async ({ rowIndex }) => {
      if (!accessToken) throw new Error('Not authenticated')
      const sheetId = await resolveSheetId(accessToken, tabName)
      const url =
        `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_CONFIG.sheetId}:batchUpdate`

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [{
            deleteDimension: {
              range: {
                sheetId,
                dimension: 'ROWS',
                startIndex: rowIndex - 1, // convert 1-based to 0-based
                endIndex: rowIndex,        // exclusive upper bound
              },
            },
          }],
        }),
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({})) as { error?: { message?: string } }
        throw new Error(err?.error?.message ?? `Failed to delete row: ${response.status}`)
      }
    },

    onMutate: async ({ rowIndex }) => {
      await queryClient.cancelQueries({ queryKey })
      const snapshot = queryClient.getQueryData<SheetData>(queryKey)
      queryClient.setQueryData<SheetData>(queryKey, (old) => {
        if (!old) return old
        // rowIndex is 1-based; array index 0 is the header row.
        // rowIndex 2 (first data row) → array index 1.
        const arrayIndex = rowIndex - 1
        return old.filter((_, i) => i !== arrayIndex)
      })
      return { snapshot }
    },

    onError: (_err, _vars, context) => {
      if (context?.snapshot !== undefined) {
        queryClient.setQueryData(queryKey, context.snapshot)
      }
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey })
    },
  })
}
