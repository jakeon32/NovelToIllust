/**
 * Generate a text prompt for scene illustration
 * This combines scene description with reference analysis (character, background, art style)
 * The generated prompt can be reviewed/edited before actual image generation
 */

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { sceneDescription, characters, backgrounds, artStyleDescription, shotType } = req.body;

  if (!sceneDescription) {
    return res.status(400).json({ error: 'Scene description is required' });
  }

  try {
    // Find which characters are actually mentioned in this specific scene
    const relevantCharacters = (characters || []).filter((char: any) =>
      char.name.trim() &&
      new RegExp(`\\b${char.name.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i').test(sceneDescription)
    );

    // Find which backgrounds are actually mentioned in this specific scene
    const relevantBackgrounds = (backgrounds || []).filter((bg: any) =>
      bg.name.trim() &&
      new RegExp(`\\b${bg.name.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i').test(sceneDescription)
    );

    // Build the comprehensive prompt
    let prompt = `Scene Description: ${sceneDescription}\n\n`;

    // Add shot type instruction
    if (shotType && shotType !== 'automatic') {
      prompt += `Shot Type: ${shotType.replace(/_/g, ' ')}\n\n`;
    }

    // Add character references
    if (relevantCharacters.length > 0) {
      prompt += `═══════════════════════════════════════\n`;
      prompt += `CHARACTER REFERENCES (HIGHEST PRIORITY)\n`;
      prompt += `═══════════════════════════════════════\n\n`;

      relevantCharacters.forEach((char: any, index: number) => {
        prompt += `Character ${index + 1}: ${char.name}\n`;
        if (char.description) {
          prompt += `Description:\n${char.description}\n`;
        }
        if (char.image) {
          prompt += `[Reference image attached]\n`;
        }
        prompt += `\n`;
      });
    }

    // Add art style reference
    if (artStyleDescription) {
      prompt += `═══════════════════════════════════════\n`;
      prompt += `ART STYLE (DRAWING TECHNIQUE ONLY)\n`;
      prompt += `═══════════════════════════════════════\n\n`;
      prompt += `${artStyleDescription}\n\n`;
      prompt += `⚠️ IMPORTANT: Apply this drawing technique to the characters above.\n`;
      prompt += `DO NOT copy any hair colors, clothing, or accessories from the art style reference.\n\n`;
    }

    // Add background references
    if (relevantBackgrounds.length > 0) {
      prompt += `═══════════════════════════════════════\n`;
      prompt += `BACKGROUND REFERENCES\n`;
      prompt += `═══════════════════════════════════════\n\n`;

      relevantBackgrounds.forEach((bg: any, index: number) => {
        prompt += `Background ${index + 1}: ${bg.name}\n`;
        if (bg.description) {
          prompt += `Description:\n${bg.description}\n`;
        }
        if (bg.image) {
          prompt += `[Reference image attached]\n`;
        }
        prompt += `\n`;
      });
    }

    // Add final instructions
    if (relevantCharacters.length > 0) {
      prompt += `═══════════════════════════════════════\n`;
      prompt += `FINAL INSTRUCTIONS\n`;
      prompt += `═══════════════════════════════════════\n\n`;
      prompt += `1. Draw characters with EXACT appearance from character references\n`;
      prompt += `2. Apply drawing technique from art style reference\n`;
      prompt += `3. Match background setting from background references\n`;
      prompt += `4. Maintain character consistency (same hair, eyes, clothes)\n`;
    }

    return res.status(200).json({ prompt });

  } catch (error: any) {
    console.error("Error generating prompt:", error);
    return res.status(500).json({ error: error.message || 'Failed to generate prompt' });
  }
}
