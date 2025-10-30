-- Add description column to characters table
ALTER TABLE characters ADD COLUMN IF NOT EXISTS description TEXT;

-- Add comment
COMMENT ON COLUMN characters.description IS 'AI-generated detailed description of character appearance';
