import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
import { BUDGETS_FIXTURE } from './fixtures/budgets.js'
import { CATEGORIES_FIXTURE } from './fixtures/categories.js'
import { ITEMIZATION_FIXTURE } from './fixtures/transactions.js'

// Default handlers — tests can override per-case with server.use(...)
export const server = setupServer(
  http.get(
    'https://sheets.googleapis.com/v4/spreadsheets/:sheetId/values/:range',
    ({ params }) => {
      const range = decodeURIComponent(params.range as string)
      if (range.startsWith('BudgetItemized')) {
        return HttpResponse.json({ values: BUDGETS_FIXTURE })
      }
      if (range.startsWith('Itemization')) {
        return HttpResponse.json({ values: ITEMIZATION_FIXTURE })
      }
      if (range.startsWith('Categories')) {
        return HttpResponse.json({ values: CATEGORIES_FIXTURE })
      }
      return HttpResponse.json({ values: [] })
    },
  ),
)
