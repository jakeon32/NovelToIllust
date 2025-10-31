/**
 * Local storage service for scene illustrations
 * Scene images are stored in browser's localStorage and will be cleared when cache is cleared
 */

const SCENE_IMAGE_PREFIX = 'scene_image_';

/**
 * Generate storage key for a scene image
 */
function getSceneKey(storyId: string, sceneId: string): string {
  return `${SCENE_IMAGE_PREFIX}${storyId}_${sceneId}`;
}

/**
 * Save a scene illustration to local storage
 * @param storyId - The story ID
 * @param sceneId - The scene ID
 * @param imageUrl - The data URL of the image (base64)
 */
export function saveSceneImage(storyId: string, sceneId: string, imageUrl: string): void {
  try {
    const key = getSceneKey(storyId, sceneId);
    localStorage.setItem(key, imageUrl);
  } catch (error) {
    console.error('Error saving scene image to local storage:', error);
    // If quota exceeded, try to clear old scene images
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      console.warn('LocalStorage quota exceeded. Consider clearing old scene images.');
    }
    throw error;
  }
}

/**
 * Get a scene illustration from local storage
 * @param storyId - The story ID
 * @param sceneId - The scene ID
 * @returns The image data URL or null if not found
 */
export function getSceneImage(storyId: string, sceneId: string): string | null {
  try {
    const key = getSceneKey(storyId, sceneId);
    return localStorage.getItem(key);
  } catch (error) {
    console.error('Error getting scene image from local storage:', error);
    return null;
  }
}

/**
 * Delete a scene illustration from local storage
 * @param storyId - The story ID
 * @param sceneId - The scene ID
 */
export function deleteSceneImage(storyId: string, sceneId: string): void {
  try {
    const key = getSceneKey(storyId, sceneId);
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Error deleting scene image from local storage:', error);
  }
}

/**
 * Delete all scene images for a specific story
 * @param storyId - The story ID
 */
export function deleteAllSceneImagesForStory(storyId: string): void {
  try {
    const prefix = `${SCENE_IMAGE_PREFIX}${storyId}_`;
    const keysToDelete: string[] = [];

    // Find all keys for this story
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        keysToDelete.push(key);
      }
    }

    // Delete all found keys
    keysToDelete.forEach(key => localStorage.removeItem(key));
  } catch (error) {
    console.error('Error deleting story scene images from local storage:', error);
  }
}

/**
 * Get the total size of all scene images in local storage (for debugging)
 * @returns Size in bytes (approximate)
 */
export function getSceneImagesStorageSize(): number {
  try {
    let totalSize = 0;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(SCENE_IMAGE_PREFIX)) {
        const value = localStorage.getItem(key);
        if (value) {
          // Approximate size: key length + value length (in bytes, assuming UTF-16)
          totalSize += (key.length + value.length) * 2;
        }
      }
    }

    return totalSize;
  } catch (error) {
    console.error('Error calculating scene images storage size:', error);
    return 0;
  }
}

/**
 * Get human-readable storage size
 */
export function getSceneImagesStorageSizeFormatted(): string {
  const bytes = getSceneImagesStorageSize();

  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}
