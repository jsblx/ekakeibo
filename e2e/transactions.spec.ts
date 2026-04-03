import { test, expect } from '@playwright/test'
import { injectFakeAuth, mockSheetsApi } from './helpers'

test.describe('Transactions page', () => {
  test('full page screenshot after data loads', async ({ page }) => {
    await injectFakeAuth(page)
    await mockSheetsApi(page)

    await page.goto('/?page=transactions')
    // Description is transformed via toSentenceCase: "WHOLE FOODS MARKET" → "Whole foods market"
    await expect(page.getByText('Whole foods market')).toBeVisible()

    await expect(page).toHaveScreenshot('transactions-loaded.png', { maxDiffPixels: 50 })
  })

  test('screenshot after filtering by search', async ({ page }) => {
    await injectFakeAuth(page)
    await mockSheetsApi(page)

    await page.goto('/?page=transactions')
    await expect(page.getByText('Whole foods market')).toBeVisible()

    await page.getByPlaceholder('Search descriptions…').fill('whole foods')
    // Other transactions should disappear
    await expect(page.getByText('Electric company')).not.toBeVisible()

    await expect(page).toHaveScreenshot('transactions-filtered.png', { maxDiffPixels: 50 })
  })
})
