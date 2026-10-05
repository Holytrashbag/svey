import { defineConfig } from 'drizzle-kit'

// drizzle-kit doesn't read .env on its own. Load it when present; variables
// already set in the shell take precedence.
try {
  process.loadEnvFile('.env')
} catch {
  // No .env file: rely on the environment.
}

export default defineConfig({
  dialect: 'postgresql',
  schema: './db/schema.ts',
  out: './db/drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
})
