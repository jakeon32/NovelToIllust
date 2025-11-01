
export interface ImageFile {
  base64: string;
  mimeType: string;
  name: string;
}

export interface Character {
  id: string;
  name: string;
  image: ImageFile | null;
  description?: string; // AI-generated detailed description of character appearance
}

export interface Background {
  id: string;
  name: string;
  image: ImageFile;
  description?: string; // AI-generated detailed description of background/setting
}

// Structured scene description for better AI consistency
export interface SceneCharacter {
  name: string;
  action: string;          // What the character is doing
  expression: string;      // Facial expression
  posture: string;         // Body language/posture
  position: string;        // Where in the scene
}

export interface SceneEnvironment {
  location: string;
  timeOfDay: string;
  lighting: string;
  weather?: string;
  atmosphere: string;
}

export interface SceneObject {
  item: string;
  description: string;
  importance: string;
}

export interface SceneMood {
  emotionalTone: string;
  tensionLevel: string;
  keyFeeling: string;
}

export interface SceneInteraction {
  characters: string[];
  type: string;            // "confrontation" / "conversation" / "support"
  description: string;
  physicalDistance: string;
}

export interface StructuredSceneDescription {
  summary: string;
  characters: SceneCharacter[];
  environment: SceneEnvironment;
  importantObjects: SceneObject[];
  mood: SceneMood;
  interactions?: SceneInteraction[];
}

export interface Scene {
  id: string;
  description: string; // Legacy: Keep for backward compatibility, will be summary
  structuredDescription?: StructuredSceneDescription; // New structured format
  imageUrl: string | null;
  isGenerating: boolean;
  shotType: string; // e.g., 'automatic', 'wide_shot', 'close_up'
  aspectRatio: string; // e.g., '1:1', '16:9', '9:16'
  customPrompt?: string; // User can override/edit the auto-generated prompt
}

export interface Story {
  id: string;
  title: string;
  novelText: string;
  characters: Character[];
  backgrounds: Background[];
  artStyle: ImageFile | null;
  artStyleDescription?: string; // AI-generated detailed description of art style
  scenes: Scene[];
}