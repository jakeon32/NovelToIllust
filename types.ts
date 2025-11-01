
export interface ImageFile {
  base64: string;
  mimeType: string;
  name: string;
}

// Structured character analysis
export interface StructuredCharacterAnalysis {
  face: {
    shape: string;
    skinTone: string;
    eyes: {
      color: string;
      shape: string;
      size: string;
    };
    nose: string;
    mouth: string;
    distinctiveMarks?: string[];
  };
  hair: {
    color: string;
    length: string;
    style: string;
    parting: string;
    texture: string;
    accessories?: string[];
  };
  body: {
    build: string;
    height: string;
    posture: string;
  };
  outfit: {
    upperBody: string;
    lowerBody: string;
    accessories: string[];
    colors: string[];
    style: string;
  };
  overallVibe: string;
}

export interface Character {
  id: string;
  name: string;
  image: ImageFile | null;
  description?: string; // Legacy: Natural language description
  structuredAnalysis?: StructuredCharacterAnalysis; // New structured format
}

// Structured background analysis
export interface StructuredBackgroundAnalysis {
  location: {
    type: string;
    setting: string;
    architecture: string;
  };
  lighting: {
    source: string[];
    quality: string;
    timeOfDay: string;
    mood: string;
  };
  colors: {
    dominant: string[];
    accents: string[];
    palette: string;
  };
  objects: Array<{
    item: string;
    description: string;
    prominence: string;
  }>;
  atmosphere: string;
}

export interface Background {
  id: string;
  name: string;
  image: ImageFile;
  description?: string; // Legacy: Natural language description
  structuredAnalysis?: StructuredBackgroundAnalysis; // New structured format
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
  sourceExcerpt: string; // The excerpt from the original novel text that this scene is based on
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

// Structured art style analysis
export interface StructuredArtStyleAnalysis {
  medium: string;
  technique: {
    rendering: string;
    lineWork: string;
    edgeQuality: string;
  };
  colorApplication: {
    style: string;
    saturation: string;
    blending: string;
  };
  shadingAndLighting: {
    shadingStyle: string;
    contrast: string;
    lightingType: string;
  };
  styleGenre: string;
  mood: string;
  distinctiveFeatures: string[];
}

export interface Story {
  id: string;
  title: string;
  novelText: string;
  characters: Character[];
  backgrounds: Background[];
  artStyle: ImageFile | null;
  artStyleDescription?: string; // Legacy: Natural language description
  artStyleStructuredAnalysis?: StructuredArtStyleAnalysis; // New structured format
  scenes: Scene[];
}