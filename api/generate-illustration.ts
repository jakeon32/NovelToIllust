import { GoogleGenAI, Modality } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
const illustrationModel = "gemini-2.5-flash-image";

// Helper function to format structured character analysis into prompt text
function formatStructuredCharacterAnalysis(structuredAnalysis: any): string {
  if (!structuredAnalysis) return '';

  let text = '\n\n🔒 **STRUCTURED CHARACTER ANALYSIS (CRITICAL - NEVER CHANGE):**\n\n';

  // Hair (MOST CRITICAL)
  if (structuredAnalysis.hair) {
    text += `📍 **HAIR (🔒 ABSOLUTE PRIORITY):**\n`;
    text += `   • Color: ${structuredAnalysis.hair.color}\n`;
    text += `   • Length: ${structuredAnalysis.hair.length}\n`;
    text += `   • Style: ${structuredAnalysis.hair.style}\n`;
    text += `   • Parting: ${structuredAnalysis.hair.parting}\n`;
    text += `   • Texture: ${structuredAnalysis.hair.texture}\n`;
    if (structuredAnalysis.hair.accessories && structuredAnalysis.hair.accessories.length > 0) {
      text += `   • Accessories: ${structuredAnalysis.hair.accessories.join(', ')}\n`;
    }
    text += '\n';
  }

  // Face & Eyes
  if (structuredAnalysis.face) {
    text += `📍 **FACE & EYES (🔒 ABSOLUTE PRIORITY):**\n`;
    if (structuredAnalysis.face.age) {
      text += `   • Apparent Age: ${structuredAnalysis.face.age} (NEVER CHANGE)\n`;
    }
    text += `   • Face Shape: ${structuredAnalysis.face.shape}\n`;
    text += `   • Skin Tone: ${structuredAnalysis.face.skinTone}\n`;
    if (structuredAnalysis.face.eyes) {
      text += `   • Eye Color: ${structuredAnalysis.face.eyes.color} (NEVER CHANGE)\n`;
      text += `   • Eye Shape: ${structuredAnalysis.face.eyes.shape}\n`;
      text += `   • Eye Size: ${structuredAnalysis.face.eyes.size}\n`;
    }
    text += `   • Nose: ${structuredAnalysis.face.nose}\n`;
    text += `   • Mouth: ${structuredAnalysis.face.mouth}\n`;
    if (structuredAnalysis.face.distinctiveMarks && structuredAnalysis.face.distinctiveMarks.length > 0) {
      text += `   • Distinctive Marks: ${structuredAnalysis.face.distinctiveMarks.join(', ')}\n`;
    }
    text += '\n';
  }

  // Body & Build
  if (structuredAnalysis.body) {
    text += `📍 **BODY & BUILD:**\n`;
    text += `   • Build: ${structuredAnalysis.body.build}\n`;
    text += `   • Height: ${structuredAnalysis.body.height}\n`;
    text += `   • Posture: ${structuredAnalysis.body.posture}\n\n`;
  }

  // Outfit & Accessories (CRITICAL)
  if (structuredAnalysis.outfit) {
    text += `📍 **OUTFIT & ACCESSORIES (🔒 ABSOLUTE PRIORITY):**\n`;
    text += `   • Upper Body: ${structuredAnalysis.outfit.upperBody}\n`;
    text += `   • Lower Body: ${structuredAnalysis.outfit.lowerBody}\n`;
    text += `   • Style: ${structuredAnalysis.outfit.style}\n`;
    text += `   • Colors: ${structuredAnalysis.outfit.colors.join(', ')}\n`;
    if (structuredAnalysis.outfit.accessories && structuredAnalysis.outfit.accessories.length > 0) {
      text += `   • Accessories: ${structuredAnalysis.outfit.accessories.join(', ')} (MUST INCLUDE!)\n`;
    }
    text += '\n';
  }

  // Overall Vibe
  if (structuredAnalysis.overallVibe) {
    text += `📍 **OVERALL VIBE:** ${structuredAnalysis.overallVibe}\n\n`;
  }

  text += `🚨 **CRITICAL REMINDER:** These specifications are PERMANENT and UNCHANGEABLE!\n`;
  text += `   • Hair color, eye color, accessories MUST match EXACTLY\n`;
  text += `   • If any feature differs, the image is INCORRECT and must be regenerated\n`;

  return text;
}

// Helper function to format structured background analysis
function formatStructuredBackgroundAnalysis(structuredAnalysis: any): string {
  if (!structuredAnalysis) return '';

  let text = '\n\n🏞️ **STRUCTURED BACKGROUND ANALYSIS:**\n\n';

  // Location
  if (structuredAnalysis.location) {
    text += `📍 **LOCATION:**\n`;
    text += `   • Type: ${structuredAnalysis.location.type}\n`;
    text += `   • Setting: ${structuredAnalysis.location.setting}\n`;
    text += `   • Architecture: ${structuredAnalysis.location.architecture}\n\n`;
  }

  // Lighting
  if (structuredAnalysis.lighting) {
    text += `💡 **LIGHTING:**\n`;
    text += `   • Source: ${structuredAnalysis.lighting.source.join(', ')}\n`;
    text += `   • Quality: ${structuredAnalysis.lighting.quality}\n`;
    text += `   • Time of Day: ${structuredAnalysis.lighting.timeOfDay}\n`;
    text += `   • Mood: ${structuredAnalysis.lighting.mood}\n\n`;
  }

  // Colors
  if (structuredAnalysis.colors) {
    text += `🎨 **COLOR PALETTE:**\n`;
    text += `   • Dominant Colors: ${structuredAnalysis.colors.dominant.join(', ')}\n`;
    text += `   • Accent Colors: ${structuredAnalysis.colors.accents.join(', ')}\n`;
    text += `   • Palette: ${structuredAnalysis.colors.palette}\n\n`;
  }

  // Objects
  if (structuredAnalysis.objects && structuredAnalysis.objects.length > 0) {
    text += `🪑 **KEY OBJECTS:**\n`;
    structuredAnalysis.objects.forEach((obj: any, idx: number) => {
      text += `   ${idx + 1}. ${obj.item}: ${obj.description} (${obj.prominence})\n`;
    });
    text += '\n';
  }

  // Atmosphere
  if (structuredAnalysis.atmosphere) {
    text += `🌟 **ATMOSPHERE:** ${structuredAnalysis.atmosphere}\n`;
  }

  return text;
}

// Helper function to format structured art style analysis
function formatStructuredArtStyleAnalysis(structuredAnalysis: any): string {
  if (!structuredAnalysis) return '';

  let text = '\n\n🎨 **STRUCTURED ART STYLE ANALYSIS (TECHNIQUE ONLY):**\n\n';

  // Medium
  if (structuredAnalysis.medium) {
    text += `📍 **MEDIUM:** ${structuredAnalysis.medium}\n\n`;
  }

  // Technique
  if (structuredAnalysis.technique) {
    text += `🖌️ **TECHNIQUE:**\n`;
    text += `   • Rendering: ${structuredAnalysis.technique.rendering}\n`;
    text += `   • Line Work: ${structuredAnalysis.technique.lineWork}\n`;
    text += `   • Edge Quality: ${structuredAnalysis.technique.edgeQuality}\n\n`;
  }

  // Color Application
  if (structuredAnalysis.colorApplication) {
    text += `🎨 **COLOR APPLICATION:**\n`;
    text += `   • Style: ${structuredAnalysis.colorApplication.style}\n`;
    text += `   • Saturation: ${structuredAnalysis.colorApplication.saturation}\n`;
    text += `   • Blending: ${structuredAnalysis.colorApplication.blending}\n\n`;
  }

  // Shading & Lighting
  if (structuredAnalysis.shadingAndLighting) {
    text += `💡 **SHADING & LIGHTING:**\n`;
    text += `   • Shading Style: ${structuredAnalysis.shadingAndLighting.shadingStyle}\n`;
    text += `   • Contrast: ${structuredAnalysis.shadingAndLighting.contrast}\n`;
    text += `   • Lighting Type: ${structuredAnalysis.shadingAndLighting.lightingType}\n\n`;
  }

  // Style Genre
  if (structuredAnalysis.styleGenre) {
    text += `📍 **STYLE GENRE:** ${structuredAnalysis.styleGenre}\n\n`;
  }

  // Mood
  if (structuredAnalysis.mood) {
    text += `🌟 **MOOD:** ${structuredAnalysis.mood}\n\n`;
  }

  // Distinctive Features
  if (structuredAnalysis.distinctiveFeatures && structuredAnalysis.distinctiveFeatures.length > 0) {
    text += `✨ **DISTINCTIVE FEATURES:**\n`;
    structuredAnalysis.distinctiveFeatures.forEach((feature: string, idx: number) => {
      text += `   ${idx + 1}. ${feature}\n`;
    });
    text += '\n';
  }

  text += `⚠️ **REMEMBER:** Apply these techniques to characters, but NEVER change character features!\n`;

  return text;
}

// Helper function to create detailed prompt from structured scene description
function createDetailedScenePrompt(structured: any, isContext: boolean = false): string {
  if (!structured) return '';

  const title = isContext ? '**CONTEXT FROM PREVIOUS SCENE:**' : '**DETAILED SCENE BREAKDOWN:**';
  let prompt = `\n${title}\n\n`;

  // Summary
  prompt += `**Scene Summary:** ${structured.summary}\n\n`;

  // Characters
  if (structured.characters && structured.characters.length > 0) {
    prompt += `**Characters in Scene:**\n`;
    structured.characters.forEach((char: any, idx: number) => {
      prompt += `${idx + 1}. **${char.name}**\n`;
      prompt += `   - Action: ${char.action}\n`;
      prompt += `   - Expression: ${char.expression}\n`;
    });
    prompt += '\n';
  }

  // Environment
  if (structured.environment) {
    prompt += `**Environment:**\n`;
    prompt += `   - Location: ${structured.environment.location}\n`;
    prompt += `   - Atmosphere: ${structured.environment.atmosphere}\n\n`;
  }

  return prompt;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sceneDescription, structuredDescription, previousSceneDescription, characters, backgrounds, artStyle, artStyleDescription, shotType, aspectRatio } = req.body;

    if (!sceneDescription && !structuredDescription) {
      return res.status(400).json({ error: 'Scene description is required' });
    }

    // --- Character Filtering Logic ---
    let relevantCharacters: any[] = [];
    let sceneCharacterNames = new Set<string>();

    if (structuredDescription?.characters?.length > 0) {
      structuredDescription.characters.forEach((c: any) => {
        if (c?.name) {
          sceneCharacterNames.add(c.name.toLowerCase().trim());
        }
      });
    }

    if (previousSceneDescription?.characters?.length > 0) {
      const prevLocation = previousSceneDescription.environment?.location?.toLowerCase().trim();
      const currentLocation = structuredDescription?.environment?.location?.toLowerCase().trim();
      if (prevLocation && currentLocation && prevLocation === currentLocation) {
        previousSceneDescription.characters.forEach((c: any) => {
          if (c?.name) {
            sceneCharacterNames.add(c.name.toLowerCase().trim());
          }
        });
      }
    }

    if (sceneCharacterNames.size > 0) {
      relevantCharacters = (characters || []).filter((char: any) => {
        const charNameLower = char?.name?.toLowerCase().trim();
        if (!charNameLower) return false;

        return Array.from(sceneCharacterNames).some(sceneNameLower => {
          return sceneNameLower.startsWith(charNameLower) || charNameLower.startsWith(sceneNameLower);
        });
      });
    }

    if (relevantCharacters.length === 0 && typeof sceneDescription === 'string') {
      relevantCharacters = (characters || []).filter((char: any) =>
        char.name?.trim() &&
        new RegExp(`\b${char.name.replace(/[-\/\\^$*+?.()|[\\]{}]/g, '\\$&')}\b`, 'i').test(sceneDescription)
      );
    }

    // --- Background Filtering Logic ---
    let relevantBackgrounds: any[] = [];
    const sceneLocationName = structuredDescription?.environment?.location?.toLowerCase().trim();
    if (sceneLocationName) {
      relevantBackgrounds = (backgrounds || []).filter((bg: any) =>
        bg.name?.trim() && sceneLocationName.includes(bg.name.toLowerCase().trim())
      );
    }

    if (relevantBackgrounds.length === 0 && typeof sceneDescription === 'string') {
      relevantBackgrounds = (backgrounds || []).filter((bg: any) =>
        bg.name?.trim() &&
        new RegExp(`\b${bg.name.replace(/[-\/\\^$*+?.()|[\\]{}]/g, '\\$&')}\b`, 'i').test(sceneDescription)
      );
    }

    // --- Prompt Assembly (V2 - Simplified for custom prompt) ---
    const { customPrompt } = req.body;
    if (!customPrompt) {
      return res.status(400).json({ error: 'Custom prompt is required for illustration generation' });
    }

    const parts: any[] = [{ text: customPrompt }];

    // 1. Art Style Reference Image (if provided)
    if (artStyle) {
      parts.push({ inlineData: { mimeType: artStyle.mimeType, data: artStyle.base64 } });
    }

    // 2. Background Reference Images (if relevant)
    relevantBackgrounds.forEach(bg => {
      if (bg.image) {
        parts.push({ inlineData: { mimeType: bg.image.mimeType, data: bg.image.base64 } });
      }
    });

    // 3. Character Reference Images (if relevant)
    relevantCharacters.forEach(char => {
      if (char.image) {
        parts.push({ inlineData: { mimeType: char.image.mimeType, data: char.image.base64 } });
      }
    });

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
          prompt: parts.filter(p => p.text).map(p => p.text).join('\n')
        });
      }
    }

    throw new Error("No image was generated by the API.");

  } catch (error: any) {
    console.error("Error generating illustration:", error);
    return res.status(500).json({ error: error.message || 'Failed to generate illustration' });
  }
}