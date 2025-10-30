import { supabase } from './supabaseClient';
import type { Story, Scene, Character, Background, ImageFile } from '../types';

/**
 * Check if a string is a valid UUID
 */
function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * Convert old-style ID to UUID (for migration)
 */
function ensureUUID(id: string): string {
  if (isValidUUID(id)) {
    return id;
  }
  // Generate a new UUID for old-style IDs
  return crypto.randomUUID();
}

/**
 * Convert ImageFile to data URL for storage
 */
function imageFileToDataUrl(imageFile: ImageFile): string {
  return `data:${imageFile.mimeType};base64,${imageFile.base64}`;
}

/**
 * Convert data URL to ImageFile
 */
function dataUrlToImageFile(dataUrl: string, name: string = 'image.png'): ImageFile | null {
  const match = dataUrl.match(/^data:(image\/[a-z]+);base64,(.+)$/);
  if (!match) {
    console.error("Invalid data URL format");
    return null;
  }
  return {
    mimeType: match[1],
    base64: match[2],
    name: name,
  };
}

/**
 * Load all stories for the current user from Supabase
 */
export async function loadStoriesFromSupabase(): Promise<Story[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Fetch stories
    const { data: storiesData, error: storiesError } = await supabase
      .from('stories')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (storiesError) throw storiesError;
    if (!storiesData) return [];

    // Fetch related data for each story
    const stories: Story[] = [];

    for (const storyData of storiesData) {
      // Fetch scenes
      const { data: scenesData, error: scenesError } = await supabase
        .from('scenes')
        .select('*')
        .eq('story_id', storyData.id)
        .order('order_index', { ascending: true });

      if (scenesError) throw scenesError;

      // Fetch characters
      const { data: charactersData, error: charactersError } = await supabase
        .from('characters')
        .select('*')
        .eq('story_id', storyData.id)
        .order('order_index', { ascending: true });

      if (charactersError) throw charactersError;

      // Fetch backgrounds
      const { data: backgroundsData, error: backgroundsError } = await supabase
        .from('backgrounds')
        .select('*')
        .eq('story_id', storyData.id)
        .order('order_index', { ascending: true });

      if (backgroundsError) throw backgroundsError;

      // Convert to Story format
      const story: Story = {
        id: storyData.id,
        title: storyData.title,
        novelText: storyData.novel_text,
        artStyle: storyData.art_style_url ? dataUrlToImageFile(storyData.art_style_url) : null,
        characters: (charactersData || []).map(c => ({
          id: c.id,
          name: c.name,
          image: c.image_url ? dataUrlToImageFile(c.image_url, c.name) : null,
        })),
        backgrounds: (backgroundsData || []).map(b => ({
          id: b.id,
          name: b.name,
          image: dataUrlToImageFile(b.image_url, b.name)!,
        })),
        scenes: (scenesData || []).map(s => ({
          id: s.id,
          description: s.description,
          imageUrl: s.image_url,
          shotType: s.shot_type || 'medium_shot',
          aspectRatio: s.aspect_ratio || '1:1',
          isGenerating: false,
        })),
      };

      stories.push(story);
    }

    return stories;
  } catch (error) {
    console.error('Error loading stories from Supabase:', error);
    throw error;
  }
}

/**
 * Save a single story to Supabase
 */
export async function saveStoryToSupabase(story: Story): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Ensure all IDs are UUIDs (for migration from old format)
    const storyId = ensureUUID(story.id);

    // Upsert story
    const { error: storyError } = await supabase
      .from('stories')
      .upsert({
        id: storyId,
        user_id: user.id,
        title: story.title,
        novel_text: story.novelText,
        art_style_url: story.artStyle ? imageFileToDataUrl(story.artStyle) : null,
        updated_at: new Date().toISOString(),
      });

    if (storyError) throw storyError;

    // Get current scene/character/background IDs to detect deletions
    const { data: existingScenes } = await supabase
      .from('scenes')
      .select('id')
      .eq('story_id', storyId);

    const { data: existingCharacters } = await supabase
      .from('characters')
      .select('id')
      .eq('story_id', storyId);

    const { data: existingBackgrounds } = await supabase
      .from('backgrounds')
      .select('id')
      .eq('story_id', storyId);

    // Upsert scenes (insert or update)
    if (story.scenes.length > 0) {
      const sceneIds = story.scenes.map(s => ensureUUID(s.id));

      const { error: scenesError } = await supabase
        .from('scenes')
        .upsert(
          story.scenes.map((scene, index) => ({
            id: ensureUUID(scene.id),
            story_id: storyId,
            description: scene.description,
            shot_type: scene.shotType,
            aspect_ratio: scene.aspectRatio,
            image_url: scene.imageUrl,
            order_index: index,
          })),
          { onConflict: 'id' }
        );

      if (scenesError) throw scenesError;

      // Delete scenes that are no longer in the story
      if (existingScenes && existingScenes.length > 0) {
        const scenesToDelete = existingScenes
          .filter(s => !sceneIds.includes(s.id))
          .map(s => s.id);

        if (scenesToDelete.length > 0) {
          await supabase.from('scenes').delete().in('id', scenesToDelete);
        }
      }
    } else {
      // If no scenes, delete all existing scenes
      await supabase.from('scenes').delete().eq('story_id', storyId);
    }

    // Upsert characters (insert or update)
    if (story.characters.length > 0) {
      const characterIds = story.characters.map(c => ensureUUID(c.id));

      const { error: charactersError } = await supabase
        .from('characters')
        .upsert(
          story.characters.map((character, index) => ({
            id: ensureUUID(character.id),
            story_id: storyId,
            name: character.name,
            image_url: character.image ? imageFileToDataUrl(character.image) : null,
            order_index: index,
          })),
          { onConflict: 'id' }
        );

      if (charactersError) throw charactersError;

      // Delete characters that are no longer in the story
      if (existingCharacters && existingCharacters.length > 0) {
        const charactersToDelete = existingCharacters
          .filter(c => !characterIds.includes(c.id))
          .map(c => c.id);

        if (charactersToDelete.length > 0) {
          await supabase.from('characters').delete().in('id', charactersToDelete);
        }
      }
    } else {
      // If no characters, delete all existing characters
      await supabase.from('characters').delete().eq('story_id', storyId);
    }

    // Upsert backgrounds (only those with images)
    const validBackgrounds = story.backgrounds.filter(bg => bg.image !== null);
    if (validBackgrounds.length > 0) {
      const backgroundIds = validBackgrounds.map(bg => ensureUUID(bg.id));

      const { error: backgroundsError } = await supabase
        .from('backgrounds')
        .upsert(
          validBackgrounds.map((background, index) => ({
            id: ensureUUID(background.id),
            story_id: storyId,
            name: background.name,
            image_url: imageFileToDataUrl(background.image),
            order_index: index,
          })),
          { onConflict: 'id' }
        );

      if (backgroundsError) throw backgroundsError;

      // Delete backgrounds that are no longer in the story
      if (existingBackgrounds && existingBackgrounds.length > 0) {
        const backgroundsToDelete = existingBackgrounds
          .filter(bg => !backgroundIds.includes(bg.id))
          .map(bg => bg.id);

        if (backgroundsToDelete.length > 0) {
          await supabase.from('backgrounds').delete().in('id', backgroundsToDelete);
        }
      }
    } else {
      // If no backgrounds, delete all existing backgrounds
      await supabase.from('backgrounds').delete().eq('story_id', storyId);
    }

    console.log('Story saved to Supabase successfully:', story.id);
  } catch (error: any) {
    console.error('Error saving story to Supabase:', error);
    console.error('Error details:', error.message, error.details, error.hint, error.code);
    throw error;
  }
}

/**
 * Save multiple stories to Supabase
 */
export async function saveStoriesToSupabase(stories: Story[]): Promise<void> {
  for (const story of stories) {
    await saveStoryToSupabase(story);
  }
}

/**
 * Delete a story from Supabase
 */
export async function deleteStoryFromSupabase(storyId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('stories')
      .delete()
      .eq('id', storyId);

    if (error) throw error;
    console.log('Story deleted from Supabase:', storyId);
  } catch (error) {
    console.error('Error deleting story from Supabase:', error);
    throw error;
  }
}
