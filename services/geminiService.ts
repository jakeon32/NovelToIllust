import type { ImageFile, Character, Background } from '../types';

// API base URL - works both in development and production
// Empty string = same-origin requests
// In development: Vite proxy forwards /api/* to production
// In production: Same-origin API calls
const API_BASE = '';

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

export const generatePrompt = async (
  sceneDescription: string,
  characters: Character[],
  backgrounds: Background[],
  artStyleDescription: string | undefined,
  shotType: string
): Promise<string> => {
  try {
    const response = await fetch(`${API_BASE}/api/generate-prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sceneDescription,
        characters,
        backgrounds,
        artStyleDescription,
        shotType,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.prompt;
  } catch (error) {
    console.error("Error generating prompt:", error);
    throw new Error("Failed to generate the prompt for the scene.");
  }
};

export const generateIllustration = async (
  sceneDescription: string,
  characters: Character[],
  backgrounds: Background[],
  artStyle: ImageFile | null,
  artStyleDescription: string | undefined,
  shotType: string,
  aspectRatio: string
): Promise<{ image: string; prompt: string }> => {
  try {
    const response = await fetch(`${API_BASE}/api/generate-illustration`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sceneDescription,
        characters,
        backgrounds,
        artStyle,
        artStyleDescription,
        shotType,
        aspectRatio,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return { image: data.image, prompt: data.prompt };
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

export const analyzeCharacter = async (image: ImageFile): Promise<string> => {
  try {
    const response = await fetch(`${API_BASE}/api/analyze-character`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.description;
  } catch (error) {
    console.error("Error analyzing character:", error);
    throw new Error("Failed to analyze character appearance.");
  }
};

export const analyzeBackground = async (image: ImageFile): Promise<string> => {
  try {
    const response = await fetch(`${API_BASE}/api/analyze-background`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.description;
  } catch (error) {
    console.error("Error analyzing background:", error);
    throw new Error("Failed to analyze background setting.");
  }
};

export const analyzeArtStyle = async (image: ImageFile): Promise<string> => {
  try {
    const response = await fetch(`${API_BASE}/api/analyze-art-style`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.description;
  } catch (error) {
    console.error("Error analyzing art style:", error);
    throw new Error("Failed to analyze art style.");
  }
};
