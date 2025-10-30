import type { ImageFile, Character, Background } from '../types';

// API base URL - works both in development and production
const API_BASE = import.meta.env.DEV ? '' : '';

export const generateTitleFromText = async (novelText: string): Promise<string> => {
  try {
    const response = await fetch(`${API_BASE}/api/generate-title`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ novelText }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.title;
  } catch (error) {
    console.error("Error generating title:", error);
    return "Untitled Story"; // Fallback title
  }
};

export const generateScenesFromText = async (novelText: string): Promise<string[]> => {
  try {
    const response = await fetch(`${API_BASE}/api/generate-scenes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ novelText }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.scenes || [];
  } catch (error) {
    console.error("Error generating scenes:", error);
    throw new Error("Failed to analyze the novel and generate scenes.");
  }
};

export const generateIllustration = async (
  sceneDescription: string,
  characters: Character[],
  backgrounds: Background[],
  artStyle: ImageFile | null,
  shotType: string,
  aspectRatio: string
): Promise<string> => {
  try {
    const response = await fetch(`${API_BASE}/api/generate-illustration`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sceneDescription,
        characters,
        backgrounds,
        artStyle,
        shotType,
        aspectRatio,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.image;
  } catch (error) {
    console.error("Error generating illustration:", error);
    throw new Error("Failed to generate the illustration for the scene.");
  }
};

export const editIllustration = async (
  originalImage: ImageFile,
  editPrompt: string
): Promise<string> => {
  try {
    const response = await fetch(`${API_BASE}/api/edit-illustration`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        originalImage,
        editPrompt,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.image;
  } catch (error) {
    console.error("Error editing illustration:", error);
    throw new Error("Failed to edit the illustration.");
  }
};

export const generateReferenceImage = async (prompt: string, artStyle: ImageFile | null): Promise<ImageFile> => {
  try {
    const response = await fetch(`${API_BASE}/api/generate-reference`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, artStyle }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.image;
  } catch (error) {
    console.error("Error generating reference image:", error);
    throw new Error("Failed to generate the reference image.");
  }
};
