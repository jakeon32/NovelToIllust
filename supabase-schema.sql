-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Stories table
CREATE TABLE IF NOT EXISTS stories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    novel_text TEXT NOT NULL,
    art_style_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scenes table
CREATE TABLE IF NOT EXISTS scenes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    shot_type TEXT DEFAULT 'medium_shot',
    aspect_ratio TEXT DEFAULT '1:1',
    image_url TEXT, -- DEPRECATED: Scene images are now stored in browser's local storage
    order_index INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Characters table
CREATE TABLE IF NOT EXISTS characters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    image_url TEXT,
    order_index INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Backgrounds table
CREATE TABLE IF NOT EXISTS backgrounds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    image_url TEXT NOT NULL,
    order_index INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_stories_user_id ON stories(user_id);
CREATE INDEX IF NOT EXISTS idx_scenes_story_id ON scenes(story_id);
CREATE INDEX IF NOT EXISTS idx_characters_story_id ON characters(story_id);
CREATE INDEX IF NOT EXISTS idx_backgrounds_story_id ON backgrounds(story_id);
CREATE INDEX IF NOT EXISTS idx_scenes_order ON scenes(story_id, order_index);
CREATE INDEX IF NOT EXISTS idx_characters_order ON characters(story_id, order_index);
CREATE INDEX IF NOT EXISTS idx_backgrounds_order ON backgrounds(story_id, order_index);

-- Enable Row Level Security
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE backgrounds ENABLE ROW LEVEL SECURITY;

-- Create policies for stories
CREATE POLICY "Users can view their own stories"
    ON stories FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own stories"
    ON stories FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stories"
    ON stories FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own stories"
    ON stories FOR DELETE
    USING (auth.uid() = user_id);

-- Create policies for scenes
CREATE POLICY "Users can view scenes of their stories"
    ON scenes FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM stories
        WHERE stories.id = scenes.story_id
        AND stories.user_id = auth.uid()
    ));

CREATE POLICY "Users can insert scenes to their stories"
    ON scenes FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM stories
        WHERE stories.id = scenes.story_id
        AND stories.user_id = auth.uid()
    ));

CREATE POLICY "Users can update scenes of their stories"
    ON scenes FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM stories
        WHERE stories.id = scenes.story_id
        AND stories.user_id = auth.uid()
    ));

CREATE POLICY "Users can delete scenes of their stories"
    ON scenes FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM stories
        WHERE stories.id = scenes.story_id
        AND stories.user_id = auth.uid()
    ));

-- Create policies for characters
CREATE POLICY "Users can view characters of their stories"
    ON characters FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM stories
        WHERE stories.id = characters.story_id
        AND stories.user_id = auth.uid()
    ));

CREATE POLICY "Users can insert characters to their stories"
    ON characters FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM stories
        WHERE stories.id = characters.story_id
        AND stories.user_id = auth.uid()
    ));

CREATE POLICY "Users can update characters of their stories"
    ON characters FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM stories
        WHERE stories.id = characters.story_id
        AND stories.user_id = auth.uid()
    ));

CREATE POLICY "Users can delete characters of their stories"
    ON characters FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM stories
        WHERE stories.id = characters.story_id
        AND stories.user_id = auth.uid()
    ));

-- Create policies for backgrounds
CREATE POLICY "Users can view backgrounds of their stories"
    ON backgrounds FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM stories
        WHERE stories.id = backgrounds.story_id
        AND stories.user_id = auth.uid()
    ));

CREATE POLICY "Users can insert backgrounds to their stories"
    ON backgrounds FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM stories
        WHERE stories.id = backgrounds.story_id
        AND stories.user_id = auth.uid()
    ));

CREATE POLICY "Users can update backgrounds of their stories"
    ON backgrounds FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM stories
        WHERE stories.id = backgrounds.story_id
        AND stories.user_id = auth.uid()
    ));

CREATE POLICY "Users can delete backgrounds of their stories"
    ON backgrounds FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM stories
        WHERE stories.id = backgrounds.story_id
        AND stories.user_id = auth.uid()
    ));

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updating updated_at
CREATE TRIGGER update_stories_updated_at
    BEFORE UPDATE ON stories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scenes_updated_at
    BEFORE UPDATE ON scenes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create storage bucket for images (run this separately in Storage dashboard or via API)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('story-images', 'story-images', true);

-- Create storage policy for images
-- CREATE POLICY "Users can upload images"
--     ON storage.objects FOR INSERT
--     WITH CHECK (bucket_id = 'story-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- CREATE POLICY "Users can view images"
--     ON storage.objects FOR SELECT
--     USING (bucket_id = 'story-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- CREATE POLICY "Users can delete their images"
--     ON storage.objects FOR DELETE
--     USING (bucket_id = 'story-images' AND auth.uid()::text = (storage.foldername(name))[1]);
