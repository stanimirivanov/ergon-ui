import { defineConfig } from '@playwright/test';
import { fileURLToPath } from 'node:url';

const wsEndpoint = process.env['ERGON_VISUAL_WS_ENDPOINT'];
if (!wsEndpoint)
  throw new Error(
    'visual:check requires the pinned renderer; see docs/development/visual-baselines.md',
  );

/** Same remote Linux renderer in local/CI runs; never silently use the host OS. */
export default defineConfig({
  testDir: './src',
  testMatch: '**/*.visual.spec.ts',
  snapshotPathTemplate: '{testDir}/visual-baselines/{arg}{ext}',
  outputDir: '../../test-output/visual',
  reporter: 'list',
  workers: 1,
  timeout: 60_000,
  retries: 0,
  forbidOnly: true,
  updateSnapshots: 'none',
  use: {
    browserName: 'chromium',
    baseURL: 'http://localhost:4300',
    connectOptions: {
      wsEndpoint,
      exposeNetwork: '<loopback>',
      timeout: 60_000,
    },
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    locale: 'en-GB',
    timezoneId: 'UTC',
    colorScheme: 'dark',
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'pnpm exec nx run @ergon/workbench:preview',
    url: 'http://localhost:4300',
    timeout: 180_000,
    reuseExistingServer: false,
    cwd: fileURLToPath(new URL('../..', import.meta.url)),
  },
});
