import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log("\n\n--- [generate-prompt] API CALLED ---");
  console.log(`Timestamp: ${new Date().toISOString()}`);

  if (req.method !== 'POST') {
    console.error(`[generate-prompt] ERROR: Method Not Allowed - Received ${req.method}`);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log("[generate-prompt] Deconstructing request body...");
    const { sceneDescription, structuredDescription, previousSceneDescription, characters, backgrounds, artStyleDescription, shotType } = req.body;

    console.log("[generate-prompt] Logging received body contents:");
    console.log(`  - sceneDescription exists: ${!!sceneDescription}`);
    console.log(`  - structuredDescription exists: ${!!structuredDescription}`);
    console.log(`  - previousSceneDescription exists: ${!!previousSceneDescription}`);
    console.log(`  - characters count: ${characters?.length || 0}`);
    console.log(`  - backgrounds count: ${backgrounds?.length || 0}`);
    console.log(`  - artStyleDescription exists: ${!!artStyleDescription}`);
    console.log(`  - shotType: ${shotType}`);

    if (!sceneDescription && !structuredDescription) {
      console.error("[generate-prompt] ERROR: Scene description is required but both are missing.");
      return res.status(400).json({ error: 'Scene description is required' });
    }

    // --- Character Filtering Logic ---
    console.log("\n[generate-prompt] Starting character filtering...");
    let relevantCharacters: any[] = [];
    let sceneCharacterNames = new Set<string>();

    console.log("[generate-prompt] Step 1: Parsing characters from current scene.");
    if (structuredDescription?.characters?.length > 0) {
      structuredDescription.characters.forEach((c: any) => {
        if (c?.name) {
          sceneCharacterNames.add(c.name.toLowerCase());
        }
      });
    }
    console.log(`[generate-prompt]   - Names from current scene: ${JSON.stringify(Array.from(sceneCharacterNames))}`);

    console.log("[generate-prompt] Step 2: Parsing characters from previous scene for continuity.");
    if (previousSceneDescription?.characters?.length > 0) {
      const prevLocation = previousSceneDescription.environment?.location?.toLowerCase().trim();
      const currentLocation = structuredDescription?.environment?.location?.toLowerCase().trim();
      console.log(`[generate-prompt]   - Previous Location: ${prevLocation}`);
      console.log(`[generate-prompt]   - Current Location: ${currentLocation}`);
      if (prevLocation && currentLocation && prevLocation === currentLocation) {
        console.log("[generate-prompt]   - Locations match. Adding previous scene characters.");
        previousSceneDescription.characters.forEach((c: any) => {
          if (c?.name) {
            sceneCharacterNames.add(c.name.toLowerCase());
          }
        });
      }
    }
    console.log(`[generate-prompt]   - Combined names for filtering: ${JSON.stringify(Array.from(sceneCharacterNames))}`);

    console.log("[generate-prompt] Step 3: Filtering master character list.");
    if (sceneCharacterNames.size > 0) {
        relevantCharacters = (characters || []).filter((char: any) => {
            const charNameLower = char?.name?.toLowerCase();
            if (!charNameLower) return false;
            return Array.from(sceneCharacterNames).some(sceneCharName => sceneCharName.startsWith(charNameLower));
        });
    }
    console.log(`[generate-prompt]   - Found ${relevantCharacters.length} characters after structured filtering.`);

    console.log("[generate-prompt] Step 4: Checking for regex fallback for characters.");
    if (relevantCharacters.length === 0 && typeof sceneDescription === 'string') {
      console.log("[generate-prompt]   - No characters found, performing regex fallback...");
      relevantCharacters = (characters || []).filter((char: any) =>
        char.name?.trim() &&
        new RegExp(`\\b${char.name.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i').test(sceneDescription)
      );
      console.log(`[generate-prompt]   - Found ${relevantCharacters.length} characters after regex fallback.`);
    }

    // --- Background Filtering Logic ---
    console.log("\n[generate-prompt] Starting background filtering...");
    let relevantBackgrounds: any[] = [];
    const sceneLocationName = structuredDescription?.environment?.location?.toLowerCase();
    console.log(`[generate-prompt]   - Location from structured description: ${sceneLocationName}`);
    if (sceneLocationName) {
      relevantBackgrounds = (backgrounds || []).filter((bg: any) =>
        bg.name?.trim() && sceneLocationName.includes(bg.name.toLowerCase())
      );
    }
    console.log(`[generate-prompt]   - Found ${relevantBackgrounds.length} backgrounds after structured filtering.`);

    console.log("[generate-prompt]   - Checking for regex fallback for backgrounds.");
    if (relevantBackgrounds.length === 0 && typeof sceneDescription === 'string') {
      console.log("[generate-prompt]   - No backgrounds found, performing regex fallback...");
      relevantBackgrounds = (backgrounds || []).filter((bg: any) =>
        bg.name?.trim() &&
        new RegExp(`\\b${bg.name.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i').test(sceneDescription)
      );
      console.log(`[generate-prompt]   - Found ${relevantBackgrounds.length} backgrounds after regex fallback.`);
    }

    // --- Prompt Assembly ---
    console.log("\n[generate-prompt] Assembling final prompt string...");
    let prompt = `Scene Description: ${sceneDescription || structuredDescription?.summary || ''}\n\n`;

    if (previousSceneDescription?.summary) {
        prompt += `Previous Scene Context: ${previousSceneDescription.summary}\n\n`;
    }

    if (shotType && shotType !== 'automatic') {
      prompt += `Shot Type: ${shotType.replace(/_/g, ' ')}\n\n`;
    }

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

    if (relevantBackgrounds.length > 0) {
      prompt += `═══════════════════════════════════════\n`;
      prompt += `🏞️  BACKGROUND REFERENCES\n`;
      prompt += `═══════════════════════════════════════\n\n`;

      relevantBackgrounds.forEach((bg: any, index: number) => {
        prompt += `━━━ Background ${index + 1}: ${bg.name} ━━━\n\n`;
        if (bg.description) {
          prompt += `📋 SETTING ANALYSIS:${bg.description}\n\n`;
        }
        if (bg.image) {
          prompt += `📷 Reference image: Registered and will be used for generation\n\n`;
        }
      });
    }

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

    console.log("[generate-prompt] Prompt assembly complete. Sending response.");
    return res.status(200).json({ prompt });

  } catch (error: any) {
    console.error("\n\n🔥🔥🔥 [generate-prompt] CATASTROPHIC FAILURE 🔥🔥🔥\n\n");
    console.error("[generate-prompt] The API handler has crashed unexpectedly.");
    console.error("Error Message:", error.message);
    console.error("Error Stack:", error.stack);
    console.error("\n\n--- END OF CRASH REPORT ---\n\n");
    return res.status(500).json({ error: 'A critical error occurred on the server. Check server logs for details.', details: error.message });
  }
}
