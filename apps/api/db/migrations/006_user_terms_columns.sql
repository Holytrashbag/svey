-- Consent audit trail: records that a user accepted the Terms and Privacy Policy
-- at registration. Nullable on purpose — users created before this migration
-- have no server-side record (left NULL rather than fabricated); new users are
-- stamped by the Better Auth create hook with the current version.
ALTER TABLE "user"
  ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS terms_version     text;
