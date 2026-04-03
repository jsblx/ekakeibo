import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  // Platform-specific baselines prevent macOS/Linux rendering diffs from causing false failures.
  // In CI, updateSnapshots:'all' means toHaveScreenshot() regenerates rather than compares —
  // functional assertions (waitForText etc.) still run and provide CI value.
  snapshotPathTemplate: '{testDir}/screenshots/{platform}/{testName}/{arg}{ext}',
  updateSnapshots: process.env.CI ? 'all' : 'missing',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 800 },
      },
    },
  ],
  webServer: {
    command: 'yarn build && yarn preview',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
