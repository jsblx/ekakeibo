import { useQuery } from '@tanstack/react-query'
import { SHEET_CONFIG } from '../config/sheets.js'

export type SheetData = string[][]

const fetchSheetData = async (accessToken: string, range: string): Promise<SheetData> => {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_CONFIG.sheetId}/values/${range}`

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({})) as { error?: { message?: string } }
    throw new Error(err?.error?.message || `Failed to fetch sheet data: ${response.status}`)
  }

  const json = await response.json() as { values?: SheetData }
  return json.values ?? []
}

export function useSheetData(accessToken: string | null, range: string) {
  const { data, isLoading, isError, error, refetch, dataUpdatedAt } = useQuery<SheetData, Error>({
    queryKey: ['sheet', range],
    queryFn: () => fetchSheetData(accessToken!, range),
    enabled: !!accessToken && !!range,
  })

  return { data, isLoading, isError, error, refetch, dataUpdatedAt }
}
