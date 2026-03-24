import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests',
  timeout: 120_000,
  expect: { timeout: 5000 },
  fullyParallel: true,
  retries: 1,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report' }]],
  use: {
    launchOptions: {    slowMo: 10000     },        // 200 milisegundos entre acciones    
    headless: false,
    viewport: { width: 1280, height: 800 },
    actionTimeout: 30_000,
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
