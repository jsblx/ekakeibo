import { type Page } from '@playwright/test'

// ─── Fixture data (same shape as src/test/fixtures/) ──────────────────────────

const BUDGETS_FIXTURE: string[][] = [
  ['Code', 'Category', 'Budget', 'Type', 'Budget to Date', 'Used', 'Remaining', 'Usage %'],
  ['Expense:Groceries', 'Living', '500', 'Monthly', '250', '200', '300', '40'],
  ['Expense:Utilities', 'Living', '150', 'Monthly', '75', '60', '90', '40'],
  ['Expense:Dining', 'Leisure', '200', 'Monthly', '100', '120', '80', '60'],
  ['Inflow:Salary', 'Income', '3000', 'Monthly', '1500', '1500', '-1500', '100'],
]

const CATEGORIES_FIXTURE: string[][] = [
  ['Code', 'Category', 'Item'],
  ['Expense:Groceries', 'Living', 'Groceries'],
  ['Expense:Utilities', 'Living', 'Utilities'],
  ['Expense:Dining', 'Leisure', 'Dining'],
  ['Inflow:Salary', 'Income', 'Salary'],
]

const ITEMIZATION_FIXTURE: string[][] = [
  ['Date', 'Description', 'Amount', 'Account', 'Code'],
  ['2026-03-15', 'WHOLE FOODS MARKET', '-45.67', 'Checking', 'Expense:Groceries'],
  ['2026-03-10', 'ELECTRIC COMPANY', '-89.50', 'Checking', 'Expense:Utilities'],
  ['2026-03-08', 'NOBU RESTAURANT', '-120.00', 'Checking', 'Expense:Dining'],
  ['2026-03-01', 'PAYROLL DEPOSIT', '3000.00', 'Checking', 'Inflow:Salary'],
]

// ─── Auth bypass ──────────────────────────────────────────────────────────────

/**
 * Injects a fake access token into sessionStorage so App.tsx skips the login
 * screen. Must be called inside a page.addInitScript() or before navigation.
 */
export async function injectFakeAuth(page: Page) {
  await page.addInitScript(() => {
    // Keys match App.tsx: TOKEN_KEY = 'gauth_token', EXPIRY_KEY = 'gauth_expiry'
    sessionStorage.setItem('gauth_token', 'fake-test-token')
    // Set expiry 1 hour from now
    sessionStorage.setItem('gauth_expiry', String(Date.now() + 60 * 60 * 1000))
  })
}

// ─── Sheets API mock ──────────────────────────────────────────────────────────

/**
 * Mocks all Sheets API calls by routing on the range path segment.
 * Returns appropriate fixture data based on which tab is being fetched.
 */
export async function mockSheetsApi(page: Page) {
  await page.route('**/spreadsheets/*/values/**', (route) => {
    const url = route.request().url()

    let values: string[][]

    if (url.includes('BudgetItemized')) {
      values = BUDGETS_FIXTURE
    } else if (url.includes('Categories')) {
      values = CATEGORIES_FIXTURE
    } else if (url.includes('Itemization')) {
      values = ITEMIZATION_FIXTURE
    } else {
      // Default: empty response
      values = []
    }

    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ values }),
    })
  })
}

/**
 * Mocks all Sheets API calls to return a 403 error.
 */
export async function mockSheetsApiError(page: Page, status = 403) {
  await page.route('**/spreadsheets/*/values/**', (route) => {
    return route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify({
        error: { message: `Request had insufficient authentication scopes.`, status: 'PERMISSION_DENIED' },
      }),
    })
  })
}
