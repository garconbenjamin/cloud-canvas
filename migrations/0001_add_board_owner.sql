-- Add board ownership metadata for title editing permissions.
ALTER TABLE boards ADD COLUMN owner_id TEXT NOT NULL DEFAULT '';
