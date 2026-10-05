import { betterAuth } from 'better-auth'
import { pool, db } from './db.ts'
import { env } from './env.ts'
import { deleteAccountData } from '../services/account.service.ts'
import { encryptToken } from './token-crypto.ts'
import { CURRENT_TERMS_VERSION } from './constants.ts'
import { sendEmail, actionEmail } from './email.ts'

// Encrypt OAuth tokens before they are written to oauth_account (at-rest TOM,
// Art. 32 GDPR). Hetzner leaves data-at-rest encryption to the controller.
type AccountTokenFields = { accessToken?: string | null; refreshToken?: string | null; idToken?: string | null }
function encryptAccountTokens<T>(account: T): T {
  const data = { ...account } as T & AccountTokenFields
  if (typeof data.accessToken === 'string') data.accessToken = encryptToken(data.accessToken)
  if (typeof data.refreshToken === 'string') data.refreshToken = encryptToken(data.refreshToken)
  if (typeof data.idToken === 'string') data.idToken = encryptToken(data.idToken)
  return data
}

// Stamp the accepted Terms/Privacy version on a new user (consent audit trail).
// Server-controlled: the matching additionalFields use `input: false`.
function stampTermsAcceptance<T>(user: T): T & { termsAcceptedAt: Date; termsVersion: string } {
  return { ...user, termsAcceptedAt: new Date(), termsVersion: CURRENT_TERMS_VERSION }
}

export const auth = betterAuth({
  database: pool,

  advanced: {
    database: {
      generateId: 'uuid',
    },
  },

  databaseHooks: {
    // Encrypt provider tokens whenever an oauth_account row is written.
    account: {
      create: { before: async (account) => ({ data: encryptAccountTokens(account) }) },
      update: { before: async (account) => ({ data: encryptAccountTokens(account) }) },
    },
    // Record acceptance of the Terms/Privacy on every new account (audit trail).
    user: {
      create: { before: async (user) => ({ data: stampTermsAcceptance(user) }) },
    },
  },

  user: {
    fields: {
      name: 'display_name',
      image: 'avatar_url',
      emailVerified: 'email_verified',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
    // Consent audit fields — server-controlled (`input: false`), stamped by the
    // create hook above and mapped to snake_case columns.
    additionalFields: {
      termsAcceptedAt: { type: 'date', required: false, input: false, fieldName: 'terms_accepted_at' },
      termsVersion: { type: 'string', required: false, input: false, fieldName: 'terms_version' },
    },
    // Account self-deletion (GDPR Art. 17). Before Better Auth removes the user,
    // sessions and oauth accounts, we erase/anonymise the app data tied to them.
    deleteUser: {
      enabled: true,
      beforeDelete: async (user) => {
        await deleteAccountData(db, user.id)
      },
    },
  },

  account: {
    modelName: 'oauth_account',
    fields: {
      userId: 'user_id',
      accountId: 'provider_account_id',
      providerId: 'provider',
      accessToken: 'access_token',
      refreshToken: 'refresh_token',
      accessTokenExpiresAt: 'access_token_expires_at',
      refreshTokenExpiresAt: 'refresh_token_expires_at',
      idToken: 'id_token',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  },

  session: {
    fields: {
      userId: 'user_id',
      expiresAt: 'expires_at',
      ipAddress: 'ip_address',
      userAgent: 'user_agent',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
    // No deletion-verification email is configured, which would otherwise block
    // OAuth users (who have no password) from deleting their account on a stale
    // session. Deletion is instead gated by an explicit in-app "type DELETE"
    // confirmation (see ProfileView), so the freshness check is disabled here.
    freshAge: 0,
  },

  verification: {
    fields: {
      expiresAt: 'expires_at',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  },

  emailAndPassword: {
    enabled: true,
    maxPasswordLength: 128,
    // Users must confirm their email before a session is created. A sign-up
    // returns no session (the verify email is sent instead); each sign-in
    // attempt by an unverified user re-sends the email and returns 403.
    requireEmailVerification: true,
    // "Forgot password" flow. The link lands the user on the SPA's
    // /reset-password page (redirectTo) with a `?token=` query param.
    sendResetPassword: async ({ user, url }) => {
      void sendEmail({
        to: user.email,
        subject: 'Reset your Svey password',
        ...actionEmail({
          heading: 'Reset your password',
          intro: 'We received a request to reset your Svey password. Click the button below to choose a new one. This link expires in 1 hour.',
          buttonLabel: 'Reset password',
          url,
        }),
      })
    },
  },

  // Email verification gates email/password login (see requireEmailVerification
  // above). OAuth providers already mark the email verified, so they're
  // unaffected. Clicking the emailed link auto-signs the user in and lands them
  // on the callbackURL passed at sign-up (/home).
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      void sendEmail({
        to: user.email,
        subject: 'Verify your email for Svey',
        ...actionEmail({
          heading: 'Verify your email',
          intro: 'Confirm your email address to finish setting up your Svey account.',
          buttonLabel: 'Verify email',
          url,
          outro: "If you didn't create a Svey account, you can ignore this email.",
        }),
      })
    },
  },

  trustedOrigins: [
    env.FRONTEND_URL,
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ],

  socialProviders: {
    discord: {
      clientId: env.DISCORD_CLIENT_ID,
      clientSecret: env.DISCORD_CLIENT_SECRET,
      // `prompt: 'none'` skips Discord's authorisation screen for users who have
      // already granted access, redirecting straight through on an existing
      // Discord session. The consent screen is only shown on first authorisation
      // (or if the granted scopes change).
      prompt: 'none',
    },
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      // No forced prompt: Google shows the consent/account screen only on first
      // authorisation, then redirects silently using the browser's existing
      // Google session on subsequent logins. (Avoid `prompt: 'none'` here — it
      // errors when any interaction is required, e.g. the user isn't signed in.)
    },
  },
})
