import type { Story } from '../types';

const DB_NAME = 'NovelToIllustDB';
const DB_VERSION = 2; // Updated to add sceneImages store
const STORE_NAME = 'stories';

// Open IndexedDB connection
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create stories store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }

      // Create sceneImages store if it doesn't exist (handled by localSceneStorage)
      // This is for compatibility when opening the DB from this module
      if (!db.objectStoreNames.contains('sceneImages')) {
        const sceneStore = db.createObjectStore('sceneImages', { keyPath: 'key' });
        sceneStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
};

// Save all stories to IndexedDB
export const saveStories = async (stories: Story[]): Promise<void> => {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    // Clear existing stories
    await new Promise<void>((resolve, reject) => {
      const clearRequest = store.clear();
      clearRequest.onsuccess = () => resolve();
      clearRequest.onerror = () => reject(clearRequest.error);
    });

    // Add all stories
    for (const story of stories) {
      await new Promise<void>((resolve, reject) => {
        const addRequest = store.put(story);
        addRequest.onsuccess = () => resolve();
        addRequest.onerror = () => reject(addRequest.error);
      });
    }

    db.close();
  } catch (error) {
    console.error('Failed to save stories to IndexedDB:', error);
    throw new Error('스토리를 저장할 수 없습니다.');
  }
};

// Load all stories from IndexedDB
export const loadStories = async (): Promise<Story[]> => {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        db.close();
        resolve(request.result || []);
      };
      request.onerror = () => {
        db.close();
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('Failed to load stories from IndexedDB:', error);
    return [];
  }
};

// Migrate data from localStorage to IndexedDB
export const migrateFromLocalStorage = async (): Promise<Story[]> => {
  try {
    const savedStories = localStorage.getItem('novel-ai-stories');
    if (savedStories) {
      const parsedStories = JSON.parse(savedStories);

      // Migrate old data: add aspectRatio to scenes and name to backgrounds
      const migratedStories = parsedStories.map((story: Story, storyIndex: number) => ({
        ...story,
        scenes: story.scenes.map((scene: any) => ({
          ...scene,
          aspectRatio: scene.aspectRatio || '1:1', // Default to square if not set
        })),
        backgrounds: (story.backgrounds || []).map((bg: any, bgIndex: number) => ({
          ...bg,
          name: bg.name || `배경 ${bgIndex + 1}`, // Default name if not set
        })),
      }));

      // Save to IndexedDB
      await saveStories(migratedStories);

      // Remove from localStorage after successful migration
      localStorage.removeItem('novel-ai-stories');

      console.log('Successfully migrated data from localStorage to IndexedDB');
      return migratedStories;
    }
    return [];
  } catch (error) {
    console.error('Failed to migrate from localStorage:', error);
    return [];
  }
};

// Check if IndexedDB is available
export const isIndexedDBAvailable = (): boolean => {
  try {
    return 'indexedDB' in window && indexedDB !== null;
  } catch (error) {
    return false;
  }
};
