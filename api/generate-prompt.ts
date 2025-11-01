import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log("\n\n--- [generate-prompt] API CALLED (DETAILED LOGGING V2) ---");
  try {
    const { sceneDescription, structuredDescription, previousSceneDescription, characters, backgrounds, artStyleDescription, shotType } = req.body;

    if (!sceneDescription && !structuredDescription) {
      return res.status(400).json({ error: 'Scene description is required' });
    }

    console.log("\n[generate-prompt] --- STARTING CHARACTER FILTERING ---");
    let relevantCharacters: any[] = [];
    let sceneCharacterNames = new Set<string>();

    if (structuredDescription?.characters?.length > 0) {
      structuredDescription.characters.forEach((c: any) => {
        if (c?.name) {
          sceneCharacterNames.add(c.name.toLowerCase().trim());
        }
      });
    }
    console.log(`[generate-prompt] Names from CURRENT scene: ${JSON.stringify(Array.from(sceneCharacterNames))}`);

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
    console.log(`[generate-prompt] Combined names from AI (current + prev): ${JSON.stringify(Array.from(sceneCharacterNames))}`);

    if (sceneCharacterNames.size > 0) {
      console.log("[generate-prompt] Filtering master character list against AI names...");
      relevantCharacters = (characters || []).filter((char: any) => {
        const charNameLower = char?.name?.toLowerCase().trim();
        if (!charNameLower) {
          console.log(`[generate-prompt]   - Skipping master list character with no name.`);
          return false;
        }

        const isMatch = Array.from(sceneCharacterNames).some(sceneNameLower => {
          console.log(`[generate-prompt]   - COMPARING: AI name '${sceneNameLower}' vs Master list name '${charNameLower}'`);
          const result = sceneNameLower.startsWith(charNameLower) || charNameLower.startsWith(sceneNameLower);
          if(result) {
            console.log(`[generate-prompt]     ✅ MATCH FOUND!`);
          }
          return result;
        });
        return isMatch;
      });
      console.log(`[generate-prompt]   - Found ${relevantCharacters.length} characters after structured filtering.`);
    }

    if (relevantCharacters.length === 0 && typeof sceneDescription === 'string') {
        console.log("[generate-prompt] No characters from structured data, attempting regex fallback...");
        relevantCharacters = (characters || []).filter((char: any) => {
            const charNameForRegex = char.name?.trim();
            if(!charNameForRegex) return false;
            const regex = new RegExp(`\\b${charNameForRegex.replace(/[-\/\\^$*+?.()|\[\]{}]/g, '\\$&')}\\b`, 'i');
            const isMatch = regex.test(sceneDescription);
            console.log(`[generate-prompt]   - REGEX TEST: Testing for '${charNameForRegex}' in scene description. Match: ${isMatch}`);
            return isMatch;
        });
        console.log(`[generate-prompt]   - Found ${relevantCharacters.length} characters after regex fallback.`);
    }
    console.log("[generate-prompt] --- CHARACTER FILTERING COMPLETE ---");

    // --- Background Filtering Logic (omitted for brevity, assuming it's not the issue) ---
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
        new RegExp(`\\b${bg.name.replace(/[-\/\\^$*+?.()|\[\]{}]/g, '\\$&')}\\b`, 'i').test(sceneDescription)
      );
    }

    // --- Prompt Assembly ---
    let prompt = `Scene Description: ${sceneDescription || structuredDescription?.summary || ''}\n\n`;
    // ... (rest of prompt assembly)

    return res.status(200).json({ prompt });

  } catch (error: any) {
    console.error("\n\n🔥🔥🔥 [generate-prompt] CATASTROPHIC FAILURE 🔥🔥🔥\n\n");
    console.error("Error Message:", error.message);
    console.error("Error Stack:", error.stack);
    console.error("\n\n--- END OF CRASH REPORT ---\\n\n");
    return res.status(500).json({ error: 'A critical error occurred on the server.', details: error.message });
  }
}
