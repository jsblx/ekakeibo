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
import { TestWrapper } from '../test/helpers.js'
import Transactions from './Transactions.js'

function renderTransactions() {
  return render(
    <TestWrapper>
      <Transactions accessToken="mock-token" />
    </TestWrapper>,
  )
}

describe('Transactions page', () => {
  it('renders transactions from sheet data', async () => {
    renderTransactions()
    await waitFor(() => {
      expect(screen.getByText(/whole foods market/i)).toBeInTheDocument()
    })
    expect(screen.getByText(/electric company/i)).toBeInTheDocument()
    expect(screen.getByText(/payroll deposit/i)).toBeInTheDocument()
  })

  it('filters transactions by search input', async () => {
    const user = userEvent.setup()
    renderTransactions()

    await waitFor(() => expect(screen.getByText(/whole foods market/i)).toBeInTheDocument())

    await user.type(screen.getByPlaceholderText('Search descriptions…'), 'whole foods')

    expect(screen.getByText(/whole foods market/i)).toBeInTheDocument()
    expect(screen.queryByText(/electric company/i)).not.toBeInTheDocument()
  })
})
