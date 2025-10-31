-- Migration: Move scene images from Supabase to local storage
-- This script removes scene image_url data from the database
-- Scene images will now be stored in browser's local storage instead

-- Set all existing scene image_url to NULL
-- This is safe because the app will now load scene images from local storage
UPDATE scenes SET image_url = NULL WHERE image_url IS NOT NULL;

-- Note: Users will need to regenerate their scene illustrations after this migration
-- Reference images (characters, backgrounds, art styles) remain in the database

-- The image_url column is kept in the schema for backward compatibility
-- but it will always be NULL going forward
