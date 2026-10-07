import { test as setup, expect } from '@playwright/test'
import { API_CONTEXT_OPTIONS, API_URL, AUTH_FILE, DEMO_USER } from './env'

// Signs the demo user in once through the API and stores the session cookie,
// so the specs start signed in (auth.spec.ts covers the sign-in UI itself).
setup('sign in the demo user', async ({ playwright }) => {
  const api = await playwright.request.newContext(API_CONTEXT_OPTIONS)
  const res = await api.post(`${API_URL}/api/auth/sign-in/email`, {
    data: { email: DEMO_USER.email, password: DEMO_USER.password },
  })
  expect(res.status()).toBe(200)
  await api.storageState({ path: AUTH_FILE })
  await api.dispose()
})
