import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sceneDescription, structuredDescription, previousSceneDescription, characters, backgrounds, artStyleDescription, shotType } = req.body;

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
      relevantCharacters = (characters || []).filter((char: any)
        => 
          char.name?.trim() &&
        new RegExp(`\\b${char.name.replace(/[-\/\\^$*+?.()|[\\]{}]/g, '\\$&')}\\b`, 'i').test(sceneDescription)
      );
    }

    // --- Background Filtering Logic ---
    let relevantBackgrounds: any[] = [];
    const sceneLocationName = structuredDescription?.environment?.location?.toLowerCase().trim();
    if (sceneLocationName) {
      relevantBackgrounds = (backgrounds || []).filter((bg: any)
        => 
          bg.name?.trim() && sceneLocationName.includes(bg.name.toLowerCase().trim())
      );
    }

    if (relevantBackgrounds.length === 0 && typeof sceneDescription === 'string') {
      relevantBackgrounds = (backgrounds || []).filter((bg: any)
        => 
          bg.name?.trim() &&
        new RegExp(`\\b${bg.name.replace(/[-\/\\^$*+?.()|[\\]{}]/g, '\\$&')}\\b`, 'i').test(sceneDescription)
      );
    }

    // --- Prompt Assembly ---
    let prompt = `Scene Description: ${sceneDescription || structuredDescription?.summary || ''}\n\n`;

    if (previousSceneDescription?.summary) {
        prompt += `Previous Scene Context: ${previousSceneDescription.summary}\n\n`;
    }

    if (shotType && shotType !== 'automatic') {
      prompt += `Shot Type: ${shotType.replace(/_/g, ' ')}\n\n`;
    }

    if (relevantCharacters.length > 0) {
      prompt += `═══════════════════════════════════════\n`
      prompt += `👤 CHARACTER REFERENCES (HIGHEST PRIORITY)\n`
      prompt += `═══════════════════════════════════════\n`
      prompt += `⚠️ These character appearances are LOCKED and must be matched EXACTLY.\n`
      prompt += `⚠️ Hair color, eye color, clothing, and accessories are NON-NEGOTIABLE.\n\n`

      relevantCharacters.forEach((char: any, index: number) => {
        prompt += `━━━ Character ${index + 1}: ${char.name} ━━━\n\n`
        if (char.description) {
          prompt += `📋 CHARACTER APPEARANCE ANALYSIS:\n`
          prompt += `${char.description}\n\n`
          prompt += `🔒 CRITICAL: This character's appearance is PERMANENT across all scenes.\n`
          prompt += `   - Hair color/style: LOCKED\n`
          prompt += `   - Eye color: LOCKED\n`
          prompt += `   - Outfit: LOCKED\n`
          prompt += `   - Accessories: LOCKED\n\n`
        } else {
          prompt += `⚠️ No AI analysis available. Refer carefully to the reference image.\n\n`
        }
        if (char.image) {
          prompt += `📷 Reference image: Registered and will be used for generation\n\n`
        } else {
          prompt += `⚠️ WARNING: No reference image available!\n\n`
        }
      });
    }

    if (artStyleDescription) {
      prompt += `═══════════════════════════════════════\n`
      prompt += `🎨 ART STYLE (DRAWING TECHNIQUE ONLY)\n`
      prompt += `═══════════════════════════════════════\n`
      prompt += `⚠️ This defines HOW to draw, NOT WHAT to draw.\n\n`
      prompt += `${artStyleDescription}\n\n`
      prompt += `🚨 CRITICAL REMINDER:\n`
      prompt += `   ✅ USE: Drawing technique, line work, shading style\n`
      prompt += `   ❌ IGNORE: Hair colors, clothing, accessories from art style image\n`
      prompt += `   → Apply this technique to the CHARACTER appearance defined above!\n\n`
    }

    if (relevantBackgrounds.length > 0) {
      prompt += `═══════════════════════════════════════\n`
      prompt += `🏞️  BACKGROUND REFERENCES\n`
      prompt += `═══════════════════════════════════════\n\n`

      relevantBackgrounds.forEach((bg: any, index: number) => {
        prompt += `━━━ Background ${index + 1}: ${bg.name} ━━━\n\n`
        if (bg.description) {
          prompt += `📋 SETTING ANALYSIS:${bg.description}\n\n`
        }
        if (bg.image) {
          prompt += `📷 Reference image: Registered and will be used for generation\n\n`
        }
      });
    }

    if (relevantCharacters.length > 0) {
      prompt += `═══════════════════════════════════════\n`
      prompt += `✅ FINAL CHECKLIST\n`
      prompt += `═══════════════════════════════════════\n\n`
      prompt += `Before generation, verify:\n`
      prompt += `☐ Character appearance from CHARACTER reference (LOCKED)\n`
      prompt += `☐ Drawing technique from ART STYLE reference\n`
      prompt += `☐ Setting/environment from BACKGROUND reference\n`
      prompt += `☐ Character features (hair, eyes, clothes) NOT copied from art style\n\n`
      prompt += `⚠️ NOTE: This is a preview. The actual generation will include all reference images.\n`
    }

    return res.status(200).json({ prompt });

  } catch (error: any) {
    console.error("Error generating prompt:", error);
    return res.status(500).json({ error: error.message || 'Failed to generate prompt' });
  }
}