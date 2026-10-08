import { randomUUID } from 'node:crypto'
import { test as base, expect } from '@playwright/test'
import { API_CONTEXT_OPTIONS, API_URL, APP_URL, SECOND_USER } from './env'

export type Pod = { id: string; name: string }

type Fixtures = {
  network: void
  pod: Pod
}

export const test = base.extend<Fixtures>({
  // Keeps every spec on the local stack: anything off localhost is aborted, and
  // the card endpoints (which proxy Scryfall) answer 404 as if the art is missing.
  network: [
    async ({ context }, use) => {
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
      await use()
    },
    { auto: true },
  ],

  // A fresh pod per test, created by the demo user (Alex) and joined by Jordan,
  // so specs never depend on each other's games.
  pod: async ({ page, playwright }, use) => {
    const name = `E2E ${randomUUID().slice(0, 8)}`
    const created = await page.request.post(`${API_URL}/api/playgroups`, { data: { name } })
    expect(created.status()).toBe(201)
    const { id, inviteCode } = (await created.json()) as { id: string; inviteCode: string }

    const jordan = await playwright.request.newContext(API_CONTEXT_OPTIONS)
    const signIn = await jordan.post(`${API_URL}/api/auth/sign-in/email`, {
      data: { email: SECOND_USER.email, password: SECOND_USER.password },
    })
    expect(signIn.status()).toBe(200)
    const joined = await jordan.post(`${API_URL}/api/playgroups/join`, { data: { code: inviteCode } })
    expect(joined.ok()).toBe(true)
    await jordan.dispose()

    await use({ id, name })
  },
})

export { expect }
