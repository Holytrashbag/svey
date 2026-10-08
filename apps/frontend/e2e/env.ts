// Ports and accounts of the end-to-end stack. Keep in sync with
// apps/api/.env.e2e (PORT, BETTER_AUTH_URL, FRONTEND_URL), apps/frontend/.env.e2e
// (VITE_API_URL) and the `preview:e2e` script.
export const API_URL = 'http://localhost:3100'
export const APP_URL = 'http://localhost:4174'

// Seeded by apps/api/jobs/seed-demo.ts (email already verified).
export const DEMO_USER = { name: 'Alex', email: 'demo@example.com', password: 'svey-demo' }
export const SECOND_USER = { name: 'Jordan', email: 'jordan@example.com', password: 'svey-demo' }

// Signed-in browser state of DEMO_USER, written by auth.setup.ts.
export const AUTH_FILE = 'e2e/.auth/demo.json'

// Better Auth checks the Origin of its own endpoints, so API request contexts
// (outside the browser) must present the app's origin.
export const API_CONTEXT_OPTIONS = { extraHTTPHeaders: { Origin: APP_URL } }
