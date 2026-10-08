import { defineConfig, devices } from '@playwright/test'
import { API_URL, APP_URL, AUTH_FILE } from './e2e/env'

// End-to-end suite against the real stack: Postgres (docker compose), a freshly
// reset + migrated + seeded `svey_e2e` database, the API on :3100 and the built
// SPA served by `vite preview` on :4174. Run from the repo root:
//   pnpm db:up && pnpm test:e2e
const isCI = !!process.env.CI

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: isCI ? 1 : undefined,
  reporter: [['html', { open: 'never' }], [isCI ? 'github' : 'list']],

  use: {
    baseURL: APP_URL,
    locale: 'en-US',
    // The PWA service worker would answer requests that page.route can't see,
    // and its "offline ready" toast can cover the bottom CTAs.
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  projects: [
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    {
      name: 'chromium-360',
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        // The layout target: a 360px-wide phone.
        viewport: { width: 360, height: 800 },
        isMobile: true,
        hasTouch: true,
        storageState: AUTH_FILE,
      },
    },
  ],

  // Database prep runs inside the API command: Playwright starts webServer
  // before globalSetup.
  webServer: [
    {
      command: 'pnpm --filter api e2e:serve',
      url: `${API_URL}/api/health`,
      reuseExistingServer: !isCI,
      timeout: 180_000,
    },
    {
      command: 'pnpm build:e2e && pnpm preview:e2e',
      url: APP_URL,
      reuseExistingServer: !isCI,
      timeout: 180_000,
    },
  ],
})
