import { GoogleGenAI, Type, Modality } from "@google/genai";
import type { ImageFile, Character, Background } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const sceneGenerationModel = "gemini-2.5-flash";
const illustrationModel = "gemini-2.5-flash-image";
const referenceImageModel = 'gemini-2.5-flash-image';


export const generateTitleFromText = async (novelText: string): Promise<string> => {
    const prompt = `Based on the following novel text, create a short, descriptive title (4-5 words maximum) for this project.

Novel Text:
\`\`\`
${novelText.substring(0, 1000)}
\`\`\`

Title:`;

    try {
        const response = await ai.models.generateContent({
            model: sceneGenerationModel,
            contents: prompt,
        });
        return response.text.trim().replace(/"/g, ''); // Clean up title
    } catch (error) {
        console.error("Error generating title:", error);
        return "Untitled Story"; // Fallback title
    }
}

export const generateScenesFromText = async (novelText: string): Promise<string[]> => {
  const prompt = `You are a scriptwriter's assistant. Your task is to read the following novel excerpt and divide it into a series of distinct, visually rich scenes suitable for illustration. Based on the length of the text, decide on a reasonable number of scenes, typically between 3 and 8. For each scene, write a concise but descriptive paragraph that captures the key action, characters, setting, and mood. This description will be used as a prompt for an AI image generator.

Novel Text:
\`\`\`
${novelText}
\`\`\`
`;
  try {
    const response = await ai.models.generateContent({
      model: sceneGenerationModel,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            scenes: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          }
        },
      },
    });

    const jsonString = response.text;
    const result = JSON.parse(jsonString);
    if (result && Array.isArray(result.scenes)) {
        return result.scenes;
    }
    return [];

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
    shotType: string
): Promise<string> => {
    try {
        // Find which characters are actually mentioned in this specific scene.
        const relevantCharacters = characters.filter(char => 
            char.name.trim() && 
            new RegExp(`\\b${char.name.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i').test(sceneDescription)
        );

        const parts: any[] = [];
        
        const shotTypeInstruction = shotType && shotType !== 'automatic'
            ? `Composition: Use a **${shotType.replace(/_/g, ' ')}** for this scene.`
            : '';


        parts.push(
            { text: `Your task is to create a single, cohesive illustration for the following scene description. You will be given reference images for art style, background(s), and potentially specific characters if they are mentioned in the scene.

${shotTypeInstruction}

Scene Description: "${sceneDescription}"

**CRITICAL INSTRUCTIONS:**
1.  **Art Style:** The final image must strictly adhere to the provided art style reference. This style dictates the overall look and feel, including line work, coloring, and texture.
2.  **Background:** The setting should be inspired by the background reference image(s). If multiple are provided, blend their elements to create a cohesive environment that fits the scene description.
3.  **Character Consistency (HIGHEST PRIORITY):**
    *   **Analyze and Replicate:** Before drawing, mentally list the key visual traits of any character reference provided (e.g., "spiky blonde hair, green eyes, red jacket, scar over left eye"). Your final drawing **MUST** replicate these features with **extreme accuracy**.
    *   **Mentioned Characters Only:** Only draw characters who are explicitly mentioned in the scene description. Reference images are provided for these characters.
    *   **High-Fidelity Match:** If a character is mentioned, their appearance in your illustration (facial structure, hair style and color, eye color, clothing, and any defining marks) **must be a perfect match** to their reference image. Consistency is paramount.
    *   **Redraw, Don't Copy:** **DO NOT** simply copy and paste the character from the reference. You must **REDRAW** the character from scratch in a new pose, with an expression that fits the scene's action and mood, while maintaining their core visual identity from the reference.
    *   **No Unmentioned Characters:** If no characters are mentioned in the scene description, **DO NOT add any people** to the illustration. Focus solely on the described environment and mood.
`
            }
        );

        if (artStyle) {
            parts.push({ text: "This is the reference for the overall ART STYLE:" });
            parts.push({ inlineData: { mimeType: artStyle.mimeType, data: artStyle.base64 } });
        }

        if (backgrounds && backgrounds.length > 0) {
            backgrounds.forEach((bg, index) => {
                const label = backgrounds.length > 1 
                    ? `This is reference ${index + 1} for the BACKGROUND/SETTING:`
                    : "This is the reference for the BACKGROUND/SETTING:";
                parts.push({ text: label });
                parts.push({ inlineData: { mimeType: bg.image.mimeType, data: bg.image.base64 } });
            });
        }
        
        // Only add references for characters relevant to this scene.
        relevantCharacters.forEach(char => {
            if (char.image) {
                parts.push({ text: `This is the HIGH-PRIORITY reference for the character named "${char.name}". Replicate their appearance with extreme accuracy as instructed.` });
                parts.push({ inlineData: { mimeType: char.image.mimeType, data: char.image.base64 } });
            }
        });

        const response = await ai.models.generateContent({
            model: illustrationModel,
            contents: { parts },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });
        
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
              const base64ImageBytes: string = part.inlineData.data;
              return `data:${part.inlineData.mimeType};base64,${base64ImageBytes}`;
            }
        }
        
        throw new Error("No image was generated by the API.");

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
        const parts: any[] = [
            {
                inlineData: {
                    mimeType: originalImage.mimeType,
                    data: originalImage.base64,
                },
            },
            {
                text: `Edit the image based on this instruction: "${editPrompt}". Only change what is requested.`,
            },
        ];

        const response = await ai.models.generateContent({
            model: illustrationModel, // 'gemini-2.5-flash-image'
            contents: { parts },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });

        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                const base64ImageBytes: string = part.inlineData.data;
                return `data:${part.inlineData.mimeType};base64,${base64ImageBytes}`;
            }
        }

        throw new Error("No edited image was generated by the API.");

    } catch (error) {
        console.error("Error editing illustration:", error);
        throw new Error("Failed to edit the illustration.");
    }
};

export const generateReferenceImage = async (prompt: string): Promise<ImageFile> => {
    try {
        const response = await ai.models.generateContent({
            model: referenceImageModel,
            contents: { parts: [{ text: prompt }] },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });

        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
              const base64ImageBytes: string = part.inlineData.data;
              const mimeType = part.inlineData.mimeType;
              return {
                base64: base64ImageBytes,
                mimeType: mimeType,
                name: `generated-${Date.now()}.${mimeType.split('/')[1] || 'png'}`
              };
            }
        }
        
        throw new Error("No image was generated by the AI for the reference prompt.");

    } catch (error) {
        console.error("Error generating reference image:", error);
        throw new Error("Failed to generate the reference image.");
    }
};