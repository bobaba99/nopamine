-- Add soft-delete support to verdicts table.
-- Hard deletes would allow users to bypass the daily verdict limit by deleting
-- their verdicts and re-submitting. With soft-delete, the row stays in the table
-- so the daily count remains accurate.
ALTER TABLE verdicts ADD COLUMN deleted_at timestamptz;

-- Index for efficient filtering of non-deleted verdicts
CREATE INDEX verdicts_deleted_at_idx ON verdicts (deleted_at) WHERE deleted_at IS NULL;
