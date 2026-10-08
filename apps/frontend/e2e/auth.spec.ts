import { test, expect } from './fixtures'
import { DEMO_USER } from './env'

test.use({ storageState: { cookies: [], origins: [] } })

test('redirects a signed-out visitor from guarded routes to /auth', async ({ page }) => {
  for (const path of ['/home', '/pods']) {
    await page.goto(path)
    await expect(page).toHaveURL('/auth')
  }
  await expect(page.getByRole('button', { name: /Continue with email/ })).toBeVisible()
})

test('signs in with the seeded demo user via email and password', async ({ page }) => {
  await page.goto('/auth')
  await page.getByRole('button', { name: /Continue with email/ }).click()
  await page.getByPlaceholder('Email address').fill(DEMO_USER.email)
  await page.getByPlaceholder('Password').fill(DEMO_USER.password)
  await page.locator('form').getByRole('button', { name: 'Sign in', exact: true }).click()

  await expect(page).toHaveURL('/home')
  await expect(page.getByText(DEMO_USER.name, { exact: true }).first()).toBeVisible()

  // Signed in, the guest-only auth screen bounces back home.
  await page.goto('/auth')
  await expect(page).toHaveURL('/home')
})
