import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  // Legacy entry tests run 22–27 s alone (first-run garment prep blocks
  // entry — known defect the rebuild removes); under a parallel suite they
  // need headroom. The rebuild's own tests finish in single-digit seconds.
  timeout: 60_000,
  expect: {
    timeout: 20_000,
  },
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:5183',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1',
    url: 'http://127.0.0.1:5183',
    reuseExistingServer: !process.env.CI,
    timeout: 20_000,
  },
})
