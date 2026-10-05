ALTER TABLE playgroup ADD COLUMN IF NOT EXISTS invite_code TEXT NOT NULL DEFAULT '';
UPDATE playgroup SET invite_code = 'SPELL-' || upper(substring(md5(id::text), 1, 4)) || '-' || lpad((floor(random() * 100))::int::text, 2, '0') WHERE invite_code = '';
ALTER TABLE playgroup ALTER COLUMN invite_code DROP DEFAULT;
CREATE UNIQUE INDEX IF NOT EXISTS playgroup_invite_code_unique ON playgroup (invite_code);
