/**
 * IndexedDB storage service for scene illustrations
 * Scene images are stored in browser's IndexedDB with much larger capacity than localStorage
 */

const DB_NAME = 'NovelToIllustDB';
const DB_VERSION = 2; // Incremented to add sceneImages store
const SCENE_STORE_NAME = 'sceneImages';

interface SceneImageRecord {
  key: string;
  imageUrl: string;
  timestamp: number;
}

/**
 * Generate storage key for a scene image
 */
function getSceneKey(storyId: string, sceneId: string): string {
  return `${storyId}_${sceneId}`;
}

/**
 * Open IndexedDB connection
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create stories store if it doesn't exist (for compatibility)
      if (!db.objectStoreNames.contains('stories')) {
        db.createObjectStore('stories', { keyPath: 'id' });
      }

      // Create sceneImages store if it doesn't exist
      if (!db.objectStoreNames.contains(SCENE_STORE_NAME)) {
        const sceneStore = db.createObjectStore(SCENE_STORE_NAME, { keyPath: 'key' });
        sceneStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

/**
 * Save a scene illustration to IndexedDB
 * @param storyId - The story ID
 * @param sceneId - The scene ID
 * @param imageUrl - The data URL of the image (base64)
 */
export async function saveSceneImage(storyId: string, sceneId: string, imageUrl: string): Promise<void> {
  try {
    const key = getSceneKey(storyId, sceneId);
    const db = await openDB();
    const transaction = db.transaction([SCENE_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(SCENE_STORE_NAME);

    const record: SceneImageRecord = {
      key,
      imageUrl,
      timestamp: Date.now(),
    };

    await new Promise<void>((resolve, reject) => {
      const request = store.put(record);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    db.close();
  } catch (error) {
    console.error('Error saving scene image to IndexedDB:', error);
    throw error;
  }
}

/**
 * Get a scene illustration from IndexedDB
 * @param storyId - The story ID
 * @param sceneId - The scene ID
 * @returns The image data URL or null if not found
 */
export async function getSceneImage(storyId: string, sceneId: string): Promise<string | null> {
  try {
    const key = getSceneKey(storyId, sceneId);
    const db = await openDB();
    const transaction = db.transaction([SCENE_STORE_NAME], 'readonly');
    const store = transaction.objectStore(SCENE_STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => {
        db.close();
        const record = request.result as SceneImageRecord | undefined;
        resolve(record ? record.imageUrl : null);
      };
      request.onerror = () => {
        db.close();
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('Error getting scene image from IndexedDB:', error);
    return null;
  }
}

/**
 * Delete a scene illustration from IndexedDB
 * @param storyId - The story ID
 * @param sceneId - The scene ID
 */
export async function deleteSceneImage(storyId: string, sceneId: string): Promise<void> {
  try {
    const key = getSceneKey(storyId, sceneId);
    const db = await openDB();
    const transaction = db.transaction([SCENE_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(SCENE_STORE_NAME);

    await new Promise<void>((resolve, reject) => {
      const request = store.delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    db.close();
  } catch (error) {
    console.error('Error deleting scene image from IndexedDB:', error);
  }
}

/**
 * Delete all scene images for a specific story from IndexedDB
 * @param storyId - The story ID
 */
export async function deleteAllSceneImagesForStory(storyId: string): Promise<void> {
  try {
    const prefix = `${storyId}_`;
    const db = await openDB();
    const transaction = db.transaction([SCENE_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(SCENE_STORE_NAME);

    // Get all keys
    const getAllRequest = store.getAllKeys();

    await new Promise<void>((resolve, reject) => {
      getAllRequest.onsuccess = async () => {
        const keys = getAllRequest.result as string[];
        const keysToDelete = keys.filter(key => key.startsWith(prefix));

        // Delete all matching keys
        for (const key of keysToDelete) {
          await new Promise<void>((delResolve, delReject) => {
            const deleteRequest = store.delete(key);
            deleteRequest.onsuccess = () => delResolve();
            deleteRequest.onerror = () => delReject(deleteRequest.error);
          });
        }

        resolve();
      };
      getAllRequest.onerror = () => reject(getAllRequest.error);
    });

    db.close();
  } catch (error) {
    console.error('Error deleting story scene images from IndexedDB:', error);
  }
}

/**
 * Get the total size of all scene images in IndexedDB (for debugging)
 * @returns Size in bytes (approximate)
 */
export async function getSceneImagesStorageSize(): Promise<number> {
  try {
    const db = await openDB();
    const transaction = db.transaction([SCENE_STORE_NAME], 'readonly');
    const store = transaction.objectStore(SCENE_STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        db.close();
        const records = request.result as SceneImageRecord[];
        let totalSize = 0;

        records.forEach(record => {
          // Approximate size: key + imageUrl length (in bytes, assuming UTF-16)
          totalSize += (record.key.length + record.imageUrl.length) * 2;
        });

        resolve(totalSize);
      };
      request.onerror = () => {
        db.close();
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('Error calculating scene images storage size:', error);
    return 0;
  }
}

/**
 * Get human-readable storage size
 */
export async function getSceneImagesStorageSizeFormatted(): Promise<string> {
  const bytes = await getSceneImagesStorageSize();

  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

/**
 * Migrate scene images from localStorage to IndexedDB
 */
export async function migrateSceneImagesFromLocalStorage(): Promise<void> {
  try {
    const SCENE_IMAGE_PREFIX = 'scene_image_';
    const itemsToMigrate: { storyId: string; sceneId: string; imageUrl: string }[] = [];

    // Find all scene images in localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(SCENE_IMAGE_PREFIX)) {
        const imageUrl = localStorage.getItem(key);
        if (imageUrl) {
          // Extract storyId and sceneId from key
          const parts = key.replace(SCENE_IMAGE_PREFIX, '').split('_');
          if (parts.length >= 2) {
            const storyId = parts.slice(0, -1).join('_');
            const sceneId = parts[parts.length - 1];
            itemsToMigrate.push({ storyId, sceneId, imageUrl });
          }
        }
      }
    }

    if (itemsToMigrate.length === 0) {
      console.log('No scene images to migrate from localStorage');
      return;
    }

    console.log(`Migrating ${itemsToMigrate.length} scene images from localStorage to IndexedDB...`);

    // Migrate to IndexedDB
    for (const item of itemsToMigrate) {
      await saveSceneImage(item.storyId, item.sceneId, item.imageUrl);
    }

    // Clean up localStorage
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && key.startsWith(SCENE_IMAGE_PREFIX)) {
        localStorage.removeItem(key);
      }
    }

    console.log('Successfully migrated scene images from localStorage to IndexedDB');
  } catch (error) {
    console.error('Error migrating scene images from localStorage:', error);
  }
}
