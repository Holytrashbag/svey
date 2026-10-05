import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL:          z.string().url(),
  BETTER_AUTH_SECRET:    z.string().min(32),
  BETTER_AUTH_URL:       z.string().url(),
  FRONTEND_URL:          z.string().url(),
  DISCORD_CLIENT_ID:     z.string(),
  DISCORD_CLIENT_SECRET: z.string(),
  GOOGLE_CLIENT_ID:      z.string(),
  GOOGLE_CLIENT_SECRET:  z.string(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().min(1024).max(65535).default(3000),
  // Optional override for where uploaded files live. Defaults to a local
  // folder in dev; in production point this at a persistent volume.
  UPLOADS_DIR: z.string().optional(),

  // Transactional email (password reset, email verification) via SMTP. All
  // optional: if SMTP_HOST/PORT/EMAIL_FROM are unset, emails are logged to the
  // console instead of sent (handy in local dev). Works with any SMTP provider.
  SMTP_HOST:   z.string().optional(),
  SMTP_PORT:   z.coerce.number().int().min(1).max(65535).optional(),
  SMTP_USER:   z.string().optional(),
  SMTP_PASS:   z.string().optional(),
  // Env values are strings: z.coerce.boolean() would turn the literal "false"
  // into `true` (Boolean("false") === true). Parse explicitly instead. Left
  // undefined when unset so email.ts can fall back to `port === 465`.
  SMTP_SECURE: z
    .string()
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true' || v === '1')),
  EMAIL_FROM:  z.string().optional(), // e.g. "Svey <noreply@svey.app>"
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors)
  process.exit(1)
}

export const env = parsed.data
