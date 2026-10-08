import { expect, type Browser, type BrowserContext } from '@playwright/test'
import { API_CONTEXT_OPTIONS, API_URL, APP_URL } from '../env'

// Keeps a context on the local stack: anything off localhost is aborted, and
// the card endpoints (which proxy Scryfall) answer 404 as if the art is missing.
export async function isolateNetwork(context: BrowserContext) {
  await context.route(/^(?!http:\/\/localhost[:/])/, (route) => route.abort())
  await context.route(`${API_URL}/api/cards/**`, (route) =>
    route.fulfill({
      status: 404,
      contentType: 'application/json',
      headers: {
        'Access-Control-Allow-Origin': APP_URL,
        'Access-Control-Allow-Credentials': 'true',
      },
      body: JSON.stringify({ error: { code: 'NOT_FOUND', message: 'stubbed in e2e' } }),
    }),
  )
}

// A 360px phone page signed in as another seeded user. The caller closes the context.
export async function signInContext(browser: Browser, user: { email: string; password: string }) {
  const context = await browser.newContext({
    baseURL: APP_URL,
    viewport: { width: 360, height: 800 },
    isMobile: true,
    hasTouch: true,
    locale: 'en-US',
    serviceWorkers: 'block',
  })
  await isolateNetwork(context)
  const res = await context.request.post(`${API_URL}/api/auth/sign-in/email`, {
    headers: API_CONTEXT_OPTIONS.extraHTTPHeaders,
    data: { email: user.email, password: user.password },
  })
  expect(res.status()).toBe(200)
  return { context, page: await context.newPage() }
}
