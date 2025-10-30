
export interface ImageFile {
  base64: string;
  mimeType: string;
  name: string;
}

export interface Character {
  id: string;
  name: string;
  image: ImageFile | null;
}

export interface Background {
  id: string;
  image: ImageFile;
}

export interface Scene {
  id: string;
  description: string;
  imageUrl: string | null;
  isGenerating: boolean;
  shotType: string; // e.g., 'automatic', 'wide_shot', 'close_up'
  aspectRatio: string; // e.g., '1:1', '16:9', '9:16'
}

export interface Story {
  id: string;
  title: string;
  novelText: string;
  characters: Character[];
  backgrounds: Background[];
  artStyle: ImageFile | null;
  scenes: Scene[];
}