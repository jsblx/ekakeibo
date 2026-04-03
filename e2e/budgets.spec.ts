import { test, expect } from '@playwright/test'
import { injectFakeAuth, mockSheetsApi, mockSheetsApiError } from './helpers'

test.describe('Budgets page', () => {
  test('full page screenshot after data loads', async ({ page }) => {
    await injectFakeAuth(page)
    await mockSheetsApi(page)

    await page.goto('/?page=budgets')
    await expect(page.getByText('Groceries')).toBeVisible()

    await expect(page).toHaveScreenshot('budgets-loaded.png', { maxDiffPixels: 50 })
  })

  test('screenshot after filtering by search', async ({ page }) => {
    await injectFakeAuth(page)
    await mockSheetsApi(page)

    await page.goto('/?page=budgets')
    await expect(page.getByText('Groceries')).toBeVisible()

    await page.getByPlaceholder('Search items…').fill('Groceries')
    // Other items should disappear
    await expect(page.getByText('Utilities')).not.toBeVisible()

    await expect(page).toHaveScreenshot('budgets-filtered.png', { maxDiffPixels: 50 })
  })

  test('screenshot of error state (403)', async ({ page }) => {
    await injectFakeAuth(page)
    await mockSheetsApiError(page, 403)

    await page.goto('/?page=budgets')
    await expect(page.getByText('Request had insufficient authentication scopes.')).toBeVisible()

    await expect(page).toHaveScreenshot('budgets-error.png', { maxDiffPixels: 50 })
  })
})
