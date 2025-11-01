-- Migration: Add structured_analysis columns for JSON-formatted reference data

-- Add structured_analysis to stories table (for AI-analyzed art style)
ALTER TABLE stories ADD COLUMN IF NOT EXISTS art_style_structured_analysis JSONB;

-- Add structured_analysis to characters table (for AI-analyzed character appearance)
ALTER TABLE characters ADD COLUMN IF NOT EXISTS structured_analysis JSONB;

-- Add structured_analysis to backgrounds table (for AI-analyzed background/setting)
ALTER TABLE backgrounds ADD COLUMN IF NOT EXISTS structured_analysis JSONB;

-- These structured analyses contain detailed JSON data with specific fields:
-- - Characters: { face, hair, body, outfit, overallVibe }
-- - Backgrounds: { lighting, colorPalette, architecture, atmosphere, keyFeatures }
-- - Art Style: { lineWork, shading, colorTreatment, detailLevel, overallStyle }
