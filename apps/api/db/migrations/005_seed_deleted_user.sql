-- Sentinel "deleted account" user.
--
-- deck.owner_user_id, game.host_user_id and playgroup.created_by are NOT NULL
-- foreign keys to "user". When a real user deletes their account, the records
-- that must be retained for other members (decks used in a game, games they
-- hosted, playgroups they created) are reassigned to this row instead of being
-- deleted. It has no oauth account and no password, so it can never be logged
-- into, and it is never shown to real users.
INSERT INTO "user" (id, display_name, email, email_verified, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'Deleted player',
  'deleted-account@svey.invalid',
  false,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;
