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
    let relevantCharacters = (characters || []).filter((char: any) =>
      char.name.trim() &&
      new RegExp(`\\b${char.name.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i').test(sceneDescription)
    );

    // FALLBACK: If no characters matched but we have characters, use all of them
    if (relevantCharacters.length === 0 && characters && characters.length > 0) {
      console.warn('⚠️ [generate-prompt] No characters matched by name. Using ALL characters as fallback.');
      relevantCharacters = characters;
    }

    // Find which backgrounds are actually mentioned in this specific scene
    let relevantBackgrounds = (backgrounds || []).filter((bg: any) =>
      bg.name.trim() &&
      new RegExp(`\\b${bg.name.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i').test(sceneDescription)
    );

    // FALLBACK: If no backgrounds matched but we have backgrounds, use all of them
    if (relevantBackgrounds.length === 0 && backgrounds && backgrounds.length > 0) {
      console.warn('⚠️ [generate-prompt] No backgrounds matched by name. Using ALL backgrounds as fallback.');
      relevantBackgrounds = backgrounds;
    }

    // Build the comprehensive prompt
    let prompt = `Scene Description: ${sceneDescription}\n\n`;

    // Add shot type instruction
    if (shotType && shotType !== 'automatic') {
      prompt += `Shot Type: ${shotType.replace(/_/g, ' ')}\n\n`;
    }

    // Add character references
    if (relevantCharacters.length > 0) {
      prompt += `═══════════════════════════════════════\n`;
      prompt += `👤 CHARACTER REFERENCES (HIGHEST PRIORITY)\n`;
      prompt += `═══════════════════════════════════════\n`;
      prompt += `⚠️ These character appearances are LOCKED and must be matched EXACTLY.\n`;
      prompt += `⚠️ Hair color, eye color, clothing, and accessories are NON-NEGOTIABLE.\n\n`;

      relevantCharacters.forEach((char: any, index: number) => {
        prompt += `━━━ Character ${index + 1}: ${char.name} ━━━\n\n`;

        if (char.description) {
          prompt += `📋 CHARACTER APPEARANCE ANALYSIS:\n`;
          prompt += `${char.description}\n\n`;
          prompt += `🔒 CRITICAL: This character's appearance is PERMANENT across all scenes.\n`;
          prompt += `   - Hair color/style: LOCKED\n`;
          prompt += `   - Eye color: LOCKED\n`;
          prompt += `   - Outfit: LOCKED\n`;
          prompt += `   - Accessories: LOCKED\n\n`;
        } else {
          prompt += `⚠️ No AI analysis available. Refer carefully to the reference image.\n\n`;
        }

        if (char.image) {
          prompt += `📷 Reference image: Registered and will be used for generation\n\n`;
        } else {
          prompt += `⚠️ WARNING: No reference image available!\n\n`;
        }
      });
    }

    // Add art style reference
    if (artStyleDescription) {
      prompt += `═══════════════════════════════════════\n`;
      prompt += `🎨 ART STYLE (DRAWING TECHNIQUE ONLY)\n`;
      prompt += `═══════════════════════════════════════\n`;
      prompt += `⚠️ This defines HOW to draw, NOT WHAT to draw.\n\n`;
      prompt += `${artStyleDescription}\n\n`;
      prompt += `🚨 CRITICAL REMINDER:\n`;
      prompt += `   ✅ USE: Drawing technique, line work, shading style\n`;
      prompt += `   ❌ IGNORE: Hair colors, clothing, accessories from art style image\n`;
      prompt += `   → Apply this technique to the CHARACTER appearance defined above!\n\n`;
    }

    // Add background references
    if (relevantBackgrounds.length > 0) {
      prompt += `═══════════════════════════════════════\n`;
      prompt += `🏞️  BACKGROUND REFERENCES\n`;
      prompt += `═══════════════════════════════════════\n\n`;

      relevantBackgrounds.forEach((bg: any, index: number) => {
        prompt += `━━━ Background ${index + 1}: ${bg.name} ━━━\n\n`;
        if (bg.description) {
          prompt += `📋 SETTING ANALYSIS:\n${bg.description}\n\n`;
        }
        if (bg.image) {
          prompt += `📷 Reference image: Registered and will be used for generation\n\n`;
        }
      });
    }

    // Add final instructions
    if (relevantCharacters.length > 0) {
      prompt += `═══════════════════════════════════════\n`;
      prompt += `✅ FINAL CHECKLIST\n`;
      prompt += `═══════════════════════════════════════\n\n`;
      prompt += `Before generation, verify:\n`;
      prompt += `☐ Character appearance from CHARACTER reference (LOCKED)\n`;
      prompt += `☐ Drawing technique from ART STYLE reference\n`;
      prompt += `☐ Setting/environment from BACKGROUND reference\n`;
      prompt += `☐ Character features (hair, eyes, clothes) NOT copied from art style\n\n`;
      prompt += `⚠️ NOTE: This is a preview. The actual generation will include all reference images.\n`;
    }

    return res.status(200).json({ prompt });

  } catch (error: any) {
    console.error("Error generating prompt:", error);
    return res.status(500).json({ error: error.message || 'Failed to generate prompt' });
  }
}
