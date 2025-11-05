
// Helper function to format structured character analysis into prompt text
function formatStructuredCharacterAnalysis(structuredAnalysis: any): string {
  if (!structuredAnalysis) return '';
  let text = '\n';
  if (structuredAnalysis.hair) {
    text += `  - **Hair:** Color: ${structuredAnalysis.hair.color}, Length: ${structuredAnalysis.hair.length}, Style: ${structuredAnalysis.hair.style}.\n`;
  }
  if (structuredAnalysis.face) {
    text += `  - **Face:** Shape: ${structuredAnalysis.face.shape}, Skin Tone: ${structuredAnalysis.face.skinTone}, Eye Color: ${structuredAnalysis.face.eyes?.color}, Apparent Age: ${structuredAnalysis.face.age}.\n`;
  }
  if (structuredAnalysis.body) {
    text += `  - **Body:** Build: ${structuredAnalysis.body.build}, Height: ${structuredAnalysis.body.height}.\n`;
  }
  if (structuredAnalysis.outfit) {
    text += `  - **Outfit:** ${structuredAnalysis.outfit.style}. Upper: ${structuredAnalysis.outfit.upperBody}, Lower: ${structuredAnalysis.outfit.lowerBody}. Key Accessories: ${(structuredAnalysis.outfit.accessories || []).join(', ')}.\n`;
  }
  if (structuredAnalysis.overallVibe) {
    text += `  - **Vibe:** ${structuredAnalysis.overallVibe}.\n`;
  }
  text += `  - **Critical Reminder:** Hair color, eye color, and key accessories MUST match EXACTLY.\n`;
  return text;
}

// Helper function to format structured background analysis
function formatStructuredBackgroundAnalysis(structuredAnalysis: any): string {
  if (!structuredAnalysis) return '';
  let text = '\n';
  if (structuredAnalysis.location) {
    text += `  - **Location Details:** Type: ${structuredAnalysis.location.type}, Setting: ${structuredAnalysis.location.setting}, Architecture: ${structuredAnalysis.location.architecture}.\n`;
  }
  if (structuredAnalysis.lighting) {
    text += `  - **Lighting:** ${structuredAnalysis.lighting.quality} lighting from ${structuredAnalysis.lighting.source.join(', ')} at ${structuredAnalysis.lighting.timeOfDay}. Mood: ${structuredAnalysis.lighting.mood}.\n`;
  }
  if (structuredAnalysis.colors) {
    text += `  - **Palette:** Dominantly ${structuredAnalysis.colors.dominant.join(', ')} with ${structuredAnalysis.colors.accents.join(', ')} accents. Overall feel: ${structuredAnalysis.colors.palette}.\n`;
  }
  if (structuredAnalysis.objects && structuredAnalysis.objects.length > 0) {
    text += `  - **Key Objects:** ${structuredAnalysis.objects.map((o: any) => o.item).join(', ')}.\n`;
  }
  return text;
}

// Helper function to format structured art style analysis
function formatStructuredArtStyleAnalysis(structuredAnalysis: any): string {
  if (!structuredAnalysis) return '';
  let text = '\n';
  if (structuredAnalysis.technique) {
    text += `  - **Technique:** ${structuredAnalysis.technique.rendering} rendering with ${structuredAnalysis.technique.lineWork} and ${structuredAnalysis.technique.edgeQuality} edges.\n`;
  }
  if (structuredAnalysis.colorApplication) {
    text += `  - **Color:** ${structuredAnalysis.colorApplication.style} color application with ${structuredAnalysis.colorApplication.saturation} saturation.\n`;
  }
  if (structuredAnalysis.shadingAndLighting) {
    text += `  - **Shading:** ${structuredAnalysis.shadingAndLighting.shadingStyle} with ${structuredAnalysis.shadingAndLighting.contrast} contrast.\n`;
  }
  if (structuredAnalysis.styleGenre) {
    text += `  - **Genre:** ${structuredAnalysis.styleGenre}.\n`;
  }
  if (structuredAnalysis.mood) {
    text += `  - **Mood:** ${structuredAnalysis.mood}.\n`;
  }
  return text;
}

// Helper function to create the main scene description block
function createSceneInstruction(structured: any, previousScene: any, shotType: string): string {
  if (!structured) return '';
  let text = ''
  text += `*   **Scene Summary:** ${structured.summary}\n`;
  if (structured.characters && structured.characters.length > 0) {
    text += `*   **Characters:**\n`;
    structured.characters.forEach((char: any) => {
      text += `    *   **${char.name}:** ${char.action}, with a(n) ${char.expression} expression.\n`;
    });
  }
  if (structured.environment) {
    text += `*   **Environment:** The scene is set in the ${structured.environment.location}, with a(n) ${structured.environment.atmosphere} atmosphere.\n`;
  }
  if (shotType && shotType !== 'automatic') {
    text += `*   **Composition:** Use a **${shotType.replace(/_/g, ' ')}**.\n`;
  }
  return text;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { structuredDescription, previousSceneDescription, characters, backgrounds, artStyleDescription, shotType, artStyleStructuredAnalysis } = req.body;

    if (!structuredDescription) {
      return res.status(400).json({ error: 'Structured description is required' });
    }

    // --- INTELLIGENT FILTERING LOGIC ---
    let relevantCharacters: any[] = [];
    let sceneCharacterNames = new Set<string>();
    if (structuredDescription.characters?.length > 0) {
      structuredDescription.characters.forEach((c: any) => {
        if (c?.name) sceneCharacterNames.add(c.name.toLowerCase().trim());
      });
    }
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

    // --- NEW PROMPT ASSEMBLY (V3) ---
    let promptText = `Your primary task is to create a single, high-quality illustration for the following scene.\n\n---\n## 🎨 SCENE TO ILLUSTRATE\n`;
    promptText += createSceneInstruction(structuredDescription, previousSceneDescription, shotType);

    if (artStyleStructuredAnalysis) {
      promptText += `\n---\n## 🖼️ ART STYLE\nStrictly adhere to the following art style for the entire illustration.\n`;
      promptText += formatStructuredArtStyleAnalysis(artStyleStructuredAnalysis);
    }

    promptText += `\n---\n## 📚 REFERENCE APPENDIX\n**CRITICAL RULE FOR USING REFERENCES:** Use the provided reference images and descriptions ONLY to understand the physical appearance (face, hair, body, clothing) of characters and the general style of backgrounds. You MUST IGNORE the specific POSE, ACTION, and COMPOSITION of the reference images. The character's actual pose, action, and expression MUST be determined by the \`## 🎨 SCENE TO ILLUSTRATE\` section above.\n\nUse the following reference details to ensure perfect consistency for characters and backgrounds.\n`;

    if (relevantCharacters.length > 0) {
      promptText += `\n### CHARACTERS\n`;
      relevantCharacters.forEach(char => {
        promptText += `\n**Character: ${char.name}**\n`;
        promptText += formatStructuredCharacterAnalysis(char.structuredAnalysis);
      });
    }

    if (relevantBackgrounds.length > 0) {
      promptText += `\n### BACKGROUNDS\n`;
      relevantBackgrounds.forEach(bg => {
        promptText += `\n**Background: ${bg.name}**\n`;
        promptText += formatStructuredBackgroundAnalysis(bg.structuredAnalysis);
      });
    }

    return res.status(200).json({ prompt: promptText });

  } catch (error: any) {
    console.error("Error in generate-prompt:", error);
    return res.status(500).json({ error: error.message || 'Failed to generate prompt' });
  }
}
