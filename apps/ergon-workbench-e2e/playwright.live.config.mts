import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './src',
  testMatch: '**/live-acceptance.spec.ts',
  workers: 1,
  retries: 0,
  timeout: 60_000,
  reporter: 'line',
  use: {
    ...devices['Desktop Chrome'],
    ignoreHTTPSErrors: true,
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
    trace: 'off',
  },
});
