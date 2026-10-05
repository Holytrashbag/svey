// Sentinel "deleted account" user, seeded by migration 002. When a user deletes
// their account, records that must be retained for other members — decks used in
// a game, games they hosted, playgroups they created — are reassigned to this row
// because those owner/host/creator columns are NOT NULL foreign keys to "user".
// Decks owned by it are invisible to every real user (deck queries filter by the
// viewer's id) and are garbage-collected by the cleanup job once no game
// references them.
export const DELETED_USER_ID = '00000000-0000-0000-0000-000000000000'

// Display name shown for a deleted player's seat in past game recaps (the
// membership link is removed, so the recap falls back to gamePlayer.guestName).
export const DELETED_PLAYER_NAME = 'Deleted player'

// Version of the Terms/Privacy a user accepts at registration. Recorded
// per-user (terms_accepted_at / terms_version) as a consent audit trail. Bump
// this whenever the legal texts change — it matches the "Stand" date shown on
// the Impressum/Datenschutz/Nutzungsbedingungen pages.
export const CURRENT_TERMS_VERSION = '2026-06-10'
