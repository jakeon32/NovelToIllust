import { GoogleGenAI, Modality } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
const illustrationModel = "gemini-2.5-flash-image";

// Helper functions are restored as they are needed for the filtering logic.
function createDetailedScenePrompt(structured: any, isContext: boolean = false): string {
  if (!structured) return '';
  const title = isContext ? '**CONTEXT FROM PREVIOUS SCENE:**' : '**DETAILED SCENE BREAKDOWN:**';
  let prompt = `
${title}

`;
  prompt += `**Scene Summary:** ${structured.summary}

`;
  if (structured.characters && structured.characters.length > 0) {
    prompt += `**Characters in Scene:**
`;
    structured.characters.forEach((char: any, idx: number) => {
      prompt += `${idx + 1}. **${char.name}**
`;
      prompt += `   - Action: ${char.action}
`;
      prompt += `   - Expression: ${char.expression}
`;
    });
    prompt += '\n';
  }
  if (structured.environment) {
    prompt += `**Environment:**
`;
    prompt += `   - Location: ${structured.environment.location}
`;
    prompt += `   - Atmosphere: ${structured.environment.atmosphere}

`;
  }
  return prompt;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { customPrompt, structuredDescription, previousSceneDescription, characters, backgrounds, artStyle, aspectRatio } = req.body;

    if (!customPrompt) {
      return res.status(400).json({ error: 'Custom prompt is required' });
    }
    if (!structuredDescription) {
      return res.status(400).json({ error: 'Structured description is required for filtering' });
    }

    // --- INTELLIGENT FILTERING LOGIC (RESTORED) ---
    // This logic correctly identifies which characters and backgrounds are in the current scene
    // based on the AI-generated structuredDescription, not the entire prompt text.
    let relevantCharacters: any[] = [];
    let sceneCharacterNames = new Set<string>();

    if (structuredDescription.characters?.length > 0) {
      structuredDescription.characters.forEach((c: any) => {
        if (c?.name) sceneCharacterNames.add(c.name.toLowerCase().trim());
      });
    }

    // Continuity check with previous scene
    if (previousSceneDescription?.characters?.length > 0) {
      const prevLocation = previousSceneDescription.environment?.location?.toLowerCase().trim();
      const currentLocation = structuredDescription.environment?.location?.toLowerCase().trim();
      if (prevLocation && currentLocation && prevLocation === currentLocation) {
        previousSceneDescription.characters.forEach((c: any) => {
          if (c?.name) sceneCharacterNames.add(c.name.toLowerCase().trim());
        });
      }
    }

    if (sceneCharacterNames.size > 0) {
      relevantCharacters = (characters || []).filter((char: any) => {
        const charNameLower = char?.name?.toLowerCase().trim();
        if (!charNameLower) return false;
        return Array.from(sceneCharacterNames).some(sceneNameLower => 
          sceneNameLower.startsWith(charNameLower) || charNameLower.startsWith(sceneNameLower)
        );
      });
    }

    let relevantBackgrounds: any[] = [];
    const sceneLocationName = structuredDescription.environment?.location?.toLowerCase().trim();
    if (sceneLocationName) {
      relevantBackgrounds = (backgrounds || []).filter((bg: any) =>
        bg.name?.trim() && sceneLocationName.includes(bg.name.toLowerCase().trim())
      );
    }
    // --- END OF FILTERING LOGIC ---

    // --- API Payload Assembly ---
    // The text part is the user-approved customPrompt.
    // The image parts are determined by the intelligent filtering logic above.
    const parts: any[] = [{ text: customPrompt }];

    if (artStyle) {
      parts.push({ inlineData: { mimeType: artStyle.mimeType, data: artStyle.base64 } });
    }

    // NOTE: Background images are intentionally NOT included to prevent composition copying
    // Only structured text descriptions are used to preserve scene composition independence
    // relevantBackgrounds.forEach(bg => {
    //   if (bg.image) {
    //     parts.push({ inlineData: { mimeType: bg.image.mimeType, data: bg.image.base64 } });
    //   }
    // });

    relevantCharacters.forEach(char => {
      if (char.image) {
        parts.push({ inlineData: { mimeType: char.image.mimeType, data: char.image.base64 } });
      }
    });

    // --- Gemini API Call ---
    const response = await ai.models.generateContent({
      model: illustrationModel,
      contents: { parts },
      config: {
        responseModalities: [Modality.IMAGE],
        ...(aspectRatio && {
          imageConfig: {
            aspectRatio: aspectRatio,
          }
        }),
      },
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        const base64ImageBytes: string = part.inlineData.data;
        return res.status(200).json({
          image: `data:${part.inlineData.mimeType};base64,${base64ImageBytes}`,
          prompt: customPrompt
        });
      }
    }

    throw new Error("No image was generated by the API.");

  } catch (error: any) {
    console.error("Error in generate-illustration:", error);
    return res.status(500).json({ error: error.message || 'Failed to generate illustration' });
  }
}