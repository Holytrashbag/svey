-- Interpolation values for notification copy (e.g. {"playgroup": "Tuesday Pod"}).
-- The client renders the localized title from `type` + `params`; `title` stays
-- as an English fallback for rows written before this column existed.
ALTER TABLE notification ADD COLUMN params JSONB;
