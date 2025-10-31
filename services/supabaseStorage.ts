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
        artStyleDescription: storyData.art_style_description || undefined,
        characters: (charactersData || []).map(c => ({
          id: c.id,
          name: c.name,
          image: c.image_url ? dataUrlToImageFile(c.image_url, c.name) : null,
          description: c.description || undefined,
        })),
        backgrounds: (backgroundsData || []).map(b => ({
          id: b.id,
          name: b.name,
          image: dataUrlToImageFile(b.image_url, b.name)!,
          description: b.description || undefined,
        })),
        scenes: (scenesData || []).map(s => ({
          id: s.id,
          description: s.description,
          imageUrl: undefined, // Scene images are stored in local storage, not Supabase
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
        art_style_description: story.artStyleDescription || null,
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
            image_url: null, // Scene images are stored in local storage, not Supabase
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
            description: character.description || null,
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
            description: background.description || null,
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

/**
 * Calculate the size of a base64 image in bytes
 */
function calculateBase64ImageSize(base64: string): number {
  // Base64 encoding increases size by ~33% (4/3)
  // Remove data URL prefix if present
  const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;

  // Calculate actual bytes: (base64 length * 3) / 4
  // Account for padding
  const padding = (base64Data.match(/=/g) || []).length;
  return Math.floor((base64Data.length * 3) / 4) - padding;
}

/**
 * Calculate total storage usage for reference images (characters, backgrounds, art style)
 * Scene images are NOT included as they are stored in local storage
 */
export async function calculateUserStorageUsage(): Promise<{
  totalBytes: number;
  totalMB: number;
  breakdown: {
    artStyles: number;
    characters: number;
    backgrounds: number;
  };
}> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const stories = await loadStoriesFromSupabase();

    let artStyleBytes = 0;
    let characterBytes = 0;
    let backgroundBytes = 0;

    for (const story of stories) {
      // Art style images
      if (story.artStyle?.base64) {
        artStyleBytes += calculateBase64ImageSize(story.artStyle.base64);
      }

      // Character reference images
      for (const character of story.characters) {
        if (character.image?.base64) {
          characterBytes += calculateBase64ImageSize(character.image.base64);
        }
      }

      // Background reference images
      for (const background of story.backgrounds) {
        if (background.image?.base64) {
          backgroundBytes += calculateBase64ImageSize(background.image.base64);
        }
      }
    }

    const totalBytes = artStyleBytes + characterBytes + backgroundBytes;
    const totalMB = totalBytes / (1024 * 1024);

    return {
      totalBytes,
      totalMB: Math.round(totalMB * 100) / 100, // Round to 2 decimal places
      breakdown: {
        artStyles: artStyleBytes,
        characters: characterBytes,
        backgrounds: backgroundBytes,
      },
    };
  } catch (error) {
    console.error('Error calculating storage usage:', error);
    throw error;
  }
}

/**
 * Check if user is within storage quota
 * @param quotaMB - Storage quota in megabytes (default: 50MB)
 * @returns Object with quota information
 */
export async function checkStorageQuota(quotaMB: number = 50): Promise<{
  used: number; // MB
  quota: number; // MB
  remaining: number; // MB
  percentage: number;
  isOverQuota: boolean;
}> {
  const usage = await calculateUserStorageUsage();
  const remaining = quotaMB - usage.totalMB;
  const percentage = (usage.totalMB / quotaMB) * 100;

  return {
    used: usage.totalMB,
    quota: quotaMB,
    remaining: Math.max(0, remaining),
    percentage: Math.min(100, Math.round(percentage * 100) / 100),
    isOverQuota: usage.totalMB > quotaMB,
  };
}
