import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: ({ count, estimateSize }: { count: number; estimateSize: (i: number) => number }) => {
    const virtualItems = Array.from({ length: count }, (_, i) => ({
      index: i,
      key: i,
      start: 0,
      size: estimateSize(i),
    }))
    return {
      getVirtualItems: () => virtualItems,
      getTotalSize: () => virtualItems.reduce((s, v) => s + v.size, 0),
      measure: () => {},
    }
  },
}))
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '../test/server.js'
import { TestWrapper } from '../test/helpers.js'
import Budgets from './Budgets.js'

function renderBudgets() {
  return render(
    <TestWrapper>
      <Budgets accessToken="mock-token" />
    </TestWrapper>,
  )
}

describe('Budgets page', () => {
  it('renders budget rows from sheet data', async () => {
    renderBudgets()
    await waitFor(() => {
      expect(screen.getByText('Groceries')).toBeInTheDocument()
    })
    expect(screen.getByText('Utilities')).toBeInTheDocument()
    expect(screen.getByText('Dining')).toBeInTheDocument()
  })

  it('filters rows by search input', async () => {
    const user = userEvent.setup()
    renderBudgets()

    await waitFor(() => expect(screen.getByText('Groceries')).toBeInTheDocument())

    await user.type(screen.getByPlaceholderText('Search items…'), 'Groceries')

    expect(screen.getByText('Groceries')).toBeInTheDocument()
    expect(screen.queryByText('Utilities')).not.toBeInTheDocument()
    expect(screen.queryByText('Dining')).not.toBeInTheDocument()
  })

  it('shows error state when the API fails', async () => {
    server.use(
      http.get(
        'https://sheets.googleapis.com/v4/spreadsheets/:sheetId/values/:range',
        () => HttpResponse.json({ error: { message: 'Forbidden' } }, { status: 403 }),
      ),
    )

    renderBudgets()

    await waitFor(() => {
      expect(screen.getByText(/Forbidden/i)).toBeInTheDocument()
    })
  })
})
