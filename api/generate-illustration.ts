import { GoogleGenAI, Modality } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
const illustrationModel = "gemini-2.5-flash-image";

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { sceneDescription, characters, backgrounds, artStyle, artStyleDescription, shotType, aspectRatio } = req.body;

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

    const parts: any[] = [];

    const shotTypeInstruction = shotType && shotType !== 'automatic'
      ? `Composition: Use a **${shotType.replace(/_/g, ' ')}** for this scene.`
      : '';

    parts.push(
      { text: `Your task is to create a single, cohesive illustration for the following scene description. You MUST use the provided reference images to maintain PERFECT CONSISTENCY across all generated scenes.

${shotTypeInstruction}

Scene Description: "${sceneDescription}"

**━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━**
**🎨 REFERENCE PRIORITY ORDER:**
**━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━**

**PRIORITY 1: CHARACTER APPEARANCE (MOST CRITICAL - NEVER COMPROMISE)**
   • Character features (hair color, eye color, clothing, accessories) are SACRED
   • Character appearance MUST be 100% IDENTICAL to the character reference
   • Character details OVERRIDE everything else - including art style preferences

**PRIORITY 2: ART STYLE & TECHNIQUE (Apply to characters, don't replace them)**
   • Use the artistic technique (line work, shading, coloring style) from art style reference
   • BUT keep the character's exact appearance from Priority 1

**PRIORITY 3: BACKGROUND/SETTING**
   • Match the environmental style and atmosphere
   • Maintain world consistency

**━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━**

**CRITICAL RULE: CHARACTER REFERENCES ARE PROVIDED FIRST AND ARE MOST IMPORTANT.**
**Study them FIRST. Memorize every detail BEFORE looking at art style or background.**
`
      }
    );

    // ============================================================================
    // RESTRUCTURED ORDER: CHARACTER REFERENCES FIRST (HIGHEST PRIORITY)
    // ============================================================================

    relevantCharacters.forEach((char: any) => {
      if (char.image) {
        // Include detailed text description if available (from AI analysis)
        const characterDescriptionText = char.description
          ? `\n\n📋 **DETAILED CHARACTER DESCRIPTION (EXTRACTED BY AI):**\n${char.description}\n\n⚠️ **This description provides EXACT specifications. Follow EVERY detail PRECISELY.**`
          : '';

        parts.push({ text: `
═══════════════════════════════════════
👤 CHARACTER REFERENCE #1: "${char.name}"
🚨 ABSOLUTE HIGHEST PRIORITY - MEMORIZE THIS FIRST
═══════════════════════════════════════

**⚠️ READ THIS CHARACTER REFERENCE BEFORE ANYTHING ELSE! ⚠️**

This character's appearance is NON-NEGOTIABLE and OVERRIDES ALL other references.${characterDescriptionText}

**MANDATORY: Study and memorize these specific features:**

📍 **EYES (CRITICAL - MATCH EXACTLY):**
   • EXACT eye color (study the reference image carefully)
   • Eye shape and size
   • Expression and gaze direction

📍 **HAIR (CRITICAL - MATCH EXACTLY):**
   • EXACT hair color (pay attention to unusual colors like grey, pink, blue, etc.)
   • Hair style, cut, and length
   • Special features (dip-dye, highlights, hair accessories)
   • Bangs, texture, and styling

📍 **FACE & SKIN:**
   • Exact skin tone
   • Face shape and structure
   • Facial features (nose, mouth, eyebrows)
   • Any marks, freckles, or distinctive features

📍 **CLOTHING & ACCESSORIES:**
   • Exact outfit and colors
   • Glasses, jewelry, or other accessories
   • Any text on clothing
   • Distinctive items

📍 **BODY & BUILD:**
   • Body proportions and type
   • Posture and stance

**YOUR ABSOLUTE REQUIREMENTS:**
1. **FIRST**: Study this reference image and description thoroughly
2. **MEMORIZE**: Every specific detail (eye color, hair color, clothing, accessories)
3. **WHEN DRAWING**: Replicate these features with 100% accuracy
4. **IF UNCERTAIN**: Refer back to THIS reference, not the art style reference
5. **REMEMBER**: This is the SAME character in a new situation, NOT a new character

**🚨 CRITICAL CHECKS BEFORE GENERATING:**
- Does my character have the EXACT SAME eye color as the reference?
- Does my character have the EXACT SAME hair color and style as the reference?
- Does my character have the EXACT SAME clothing and accessories as the reference?
- If ANY answer is "no", STOP and study the reference again.

The character's appearance is SACRED. This is NON-NEGOTIABLE.
` });
        parts.push({ inlineData: { mimeType: char.image.mimeType, data: char.image.base64 } });
      }
    });

    // ============================================================================
    // NOW ADD ART STYLE REFERENCE (TECHNIQUE ONLY, NOT CHARACTER APPEARANCE)
    // ============================================================================

    if (artStyle) {
      // Include detailed text description if available (from AI analysis)
      const artStyleDescriptionText = artStyleDescription
        ? `\n\n📋 **DETAILED ART STYLE DESCRIPTION (EXTRACTED BY AI):**\n${artStyleDescription}\n\n⚠️ **This description provides exact details about the artistic technique. Follow it PRECISELY.**`
        : '';

      parts.push({ text: `
═══════════════════════════════════════
🎨 ART STYLE REFERENCE (TECHNIQUE ONLY)
═══════════════════════════════════════

⚠️ **IMPORTANT**: This reference is ONLY for artistic style and technique!
⚠️ **DO NOT** use this reference for character appearance!${artStyleDescriptionText}

**APPLY FROM THIS REFERENCE:**
• Line work thickness and quality
• Coloring technique (digital, watercolor, oil painting, etc.)
• Shading and lighting style
• Color palette and saturation levels (EXCEPT for character-specific colors)
• Brush strokes and texture
• Level of detail and realism
• Overall artistic mood and atmosphere

**COMPLETELY IGNORE FROM THIS REFERENCE:**
• Any people, characters, or figures shown
• Facial features, eye color, hair color, body types
• Character clothing or accessories
• Character poses or expressions

**YOUR TASK:**
1. Study the CHARACTER reference(s) ABOVE - they define what to draw
2. Study THIS art style reference - it defines HOW to draw
3. Draw the CHARACTER from above using the TECHNIQUE from this reference
4. Think: "Same character, different art style"

**REMINDER**: The characters provided ABOVE have the ONLY correct appearance. This art style reference is just teaching you the drawing technique.
` });
      parts.push({ inlineData: { mimeType: artStyle.mimeType, data: artStyle.base64 } });
    }

    // ============================================================================
    // BACKGROUND REFERENCES (PRIORITY 3)
    // ============================================================================

    if (relevantBackgrounds && relevantBackgrounds.length > 0) {
      relevantBackgrounds.forEach((bg: any, index: number) => {
        // Include detailed text description if available (from AI analysis)
        const backgroundDescriptionText = bg.description
          ? `\n\n📋 **DETAILED BACKGROUND DESCRIPTION (EXTRACTED BY AI):**\n${bg.description}\n\n⚠️ **This description provides exact details about the setting. Follow it PRECISELY.**`
          : '';

        const label = relevantBackgrounds.length > 1
          ? `═══════════════════════════════════════\n🏞️ BACKGROUND REFERENCE ${index + 1}: "${bg.name}" (MANDATORY TO FOLLOW):\n═══════════════════════════════════════\n\nThis is the reference for "${bg.name}" mentioned in the scene.${backgroundDescriptionText}\n\nAnalyze this background reference carefully. Note the architectural style, color palette, lighting mood, and environmental details. Your scene's setting MUST feel like it exists in this same world. Maintain consistency in style, atmosphere, and design language.\n\n**REMINDER**: Keep the CHARACTER appearance from the reference above unchanged!`
          : `═══════════════════════════════════════\n🏞️ BACKGROUND REFERENCE: "${bg.name}" (MANDATORY TO FOLLOW):\n═══════════════════════════════════════\n\nThis is the reference for "${bg.name}" mentioned in the scene.${backgroundDescriptionText}\n\nAnalyze this background reference carefully. Note the architectural style, color palette, lighting mood, and environmental details. Your scene's setting MUST feel like it exists in this same world. Maintain consistency in style, atmosphere, and design language.\n\n**REMINDER**: Keep the CHARACTER appearance from the reference above unchanged!`;
        parts.push({ text: label });
        parts.push({ inlineData: { mimeType: bg.image.mimeType, data: bg.image.base64 } });
      });
    }

    // ============================================================================
    // FINAL REMINDER: Reinforce character consistency
    // ============================================================================

    if (relevantCharacters.length > 0) {
      parts.push({ text: `
**━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━**
**🚨 FINAL CHECKLIST BEFORE GENERATING:**
**━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━**

Before you generate the image, verify:

✓ I have studied the CHARACTER reference(s) at the beginning
✓ I have memorized the EXACT eye color from the character reference
✓ I have memorized the EXACT hair color and style from the character reference
✓ I have memorized the EXACT clothing and accessories from the character reference
✓ I am applying the ART STYLE technique to the character, NOT replacing the character
✓ I am NOT copying any people from the art style reference
✓ The background matches the setting references provided

**Remember: The character's appearance is SACRED. Eye color, hair color, and distinctive features MUST match the character reference EXACTLY.**
` });
    }

    // Extract text parts for logging/debugging
    const textPrompt = parts
      .filter((p: any) => p.text)
      .map((p: any) => p.text)
      .join('\n\n');

    console.log('📝 Full prompt being sent to Gemini:');
    console.log('='.repeat(80));
    console.log(textPrompt);
    console.log('='.repeat(80));

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
          prompt: textPrompt, // Return the prompt so it can be saved
        });
      }
    }

    throw new Error("No image was generated by the API.");

  } catch (error: any) {
    console.error("Error generating illustration:", error);
    return res.status(500).json({ error: error.message || 'Failed to generate illustration' });
  }
}
