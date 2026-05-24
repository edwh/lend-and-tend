const { defineConfig, devices } = require('@playwright/test')

const LAT_BASE_URL = process.env.LAT_BASE_URL || 'http://localhost:4002'

module.exports = defineConfig({
  testDir: './tests/e2e/lat',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { open: 'never', host: '0.0.0.0' }],
  ],
  timeout: 600_000,
  expect: { timeout: 15_000 },
  outputDir: 'test-results-lat',
  use: {
    baseURL: LAT_BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    navigationTimeout: 30_000,
    actionTimeout: 10_000,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
        launchOptions: {
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
          ],
        },
      },
    },
  ],
})
