-- 0018_talks_folders_r2.sql
-- Migrate talks from external-link-only to self-hosted MP3 on Cloudflare R2
-- with folder support.

-- Create talk_folders table
CREATE TABLE IF NOT EXISTS talk_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add new columns to talks table
ALTER TABLE talks ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES talk_folders(id) ON DELETE SET NULL;
ALTER TABLE talks ADD COLUMN IF NOT EXISTS storage_key TEXT;
ALTER TABLE talks ADD COLUMN IF NOT EXISTS file_size INTEGER;
ALTER TABLE talks ADD COLUMN IF NOT EXISTS duration INTEGER;
ALTER TABLE talks ADD COLUMN IF NOT EXISTS description TEXT;

-- Make external_url nullable (self-hosted talks don't have an external URL)
ALTER TABLE talks ALTER COLUMN external_url DROP NOT NULL;

-- Rename 'category' to 'description' is not needed — we keep category as-is
-- but new talks use 'description' instead. Old talks keep their category.

-- Add index for folder lookups
CREATE INDEX IF NOT EXISTS talks_folder_idx ON talks(folder_id);
