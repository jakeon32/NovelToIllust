import { GoogleGenAI, Modality } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
const illustrationModel = "gemini-2.5-flash-image";

// Helper function to create detailed prompt from structured scene description
function createDetailedScenePrompt(structured: any): string {
  if (!structured) return '';

  let prompt = `\n**DETAILED SCENE BREAKDOWN:**\n\n`;

  // Summary
  prompt += `**Scene Summary:** ${structured.summary}\n\n`;

  // Characters
  if (structured.characters && structured.characters.length > 0) {
    prompt += `**Characters in Scene:**\n`;
    structured.characters.forEach((char: any, idx: number) => {
      prompt += `${idx + 1}. **${char.name}**\n`;
      prompt += `   - Action: ${char.action}\n`;
      prompt += `   - Expression: ${char.expression}\n`;
      prompt += `   - Posture: ${char.posture}\n`;
      prompt += `   - Position: ${char.position}\n`;
    });
    prompt += '\n';
  }

  // Environment
  if (structured.environment) {
    prompt += `**Environment:**\n`;
    prompt += `   - Location: ${structured.environment.location}\n`;
    prompt += `   - Time of Day: ${structured.environment.timeOfDay}\n`;
    prompt += `   - Lighting: ${structured.environment.lighting}\n`;
    if (structured.environment.weather) {
      prompt += `   - Weather: ${structured.environment.weather}\n`;
    }
    prompt += `   - Atmosphere: ${structured.environment.atmosphere}\n\n`;
  }

  // Important Objects
  if (structured.importantObjects && structured.importantObjects.length > 0) {
    prompt += `**Important Objects:**\n`;
    structured.importantObjects.forEach((obj: any, idx: number) => {
      prompt += `${idx + 1}. **${obj.item}**: ${obj.description} (${obj.importance})\n`;
    });
    prompt += '\n';
  }

  // Mood
  if (structured.mood) {
    prompt += `**Mood & Atmosphere:**\n`;
    prompt += `   - Emotional Tone: ${structured.mood.emotionalTone}\n`;
    prompt += `   - Tension Level: ${structured.mood.tensionLevel}\n`;
    prompt += `   - Key Feeling: ${structured.mood.keyFeeling}\n\n`;
  }

  // Interactions
  if (structured.interactions && structured.interactions.length > 0) {
    prompt += `**Character Interactions:**\n`;
    structured.interactions.forEach((interaction: any, idx: number) => {
      prompt += `${idx + 1}. ${interaction.characters.join(' & ')}\n`;
      prompt += `   - Type: ${interaction.type}\n`;
      prompt += `   - Description: ${interaction.description}\n`;
      prompt += `   - Physical Distance: ${interaction.physicalDistance}\n`;
    });
    prompt += '\n';
  }

  return prompt;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { sceneDescription, structuredDescription, characters, backgrounds, artStyle, artStyleDescription, shotType, aspectRatio } = req.body;

  if (!sceneDescription && !structuredDescription) {
    return res.status(400).json({ error: 'Scene description is required' });
  }

  console.log('\n' + '='.repeat(100));
  console.log('🔍 DEBUGGING: generate-illustration.ts received data');
  console.log('='.repeat(100));
  console.log('📝 Scene Description:', sceneDescription);
  console.log('👥 Characters received:', characters?.length || 0);
  characters?.forEach((char: any, idx: number) => {
    console.log(`   Character ${idx + 1}:`, {
      name: char.name,
      hasImage: !!char.image,
      hasDescription: !!char.description,
      imageType: char.image?.mimeType,
      imageSize: char.image?.base64?.length || 0,
      descriptionPreview: char.description?.substring(0, 100) || 'NO DESCRIPTION'
    });
  });
  console.log('🏞️  Backgrounds received:', backgrounds?.length || 0);
  backgrounds?.forEach((bg: any, idx: number) => {
    console.log(`   Background ${idx + 1}:`, {
      name: bg.name,
      hasImage: !!bg.image,
      hasDescription: !!bg.description,
      imageType: bg.image?.mimeType,
      imageSize: bg.image?.base64?.length || 0,
      descriptionPreview: bg.description?.substring(0, 100) || 'NO DESCRIPTION'
    });
  });
  console.log('🎨 Art Style:', {
    hasImage: !!artStyle,
    hasDescription: !!artStyleDescription,
    imageType: artStyle?.mimeType,
    imageSize: artStyle?.base64?.length || 0,
    descriptionPreview: artStyleDescription?.substring(0, 100) || 'NO DESCRIPTION'
  });
  console.log('='.repeat(100) + '\n');

  try {
    // Find which characters are actually mentioned in this specific scene
    let relevantCharacters: any[] = [];

    if (structuredDescription && structuredDescription.characters) {
      // Use character names from structured description
      const sceneCharacterNames = structuredDescription.characters.map((c: any) => c.name.toLowerCase());
      relevantCharacters = (characters || []).filter((char: any) =>
        sceneCharacterNames.includes(char.name.toLowerCase())
      );
    } else {
      // Fallback to text matching if no structured description
      relevantCharacters = (characters || []).filter((char: any) =>
        char.name.trim() &&
        new RegExp(`\\b${char.name.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i').test(sceneDescription)
      );
    }

    // FALLBACK: If no characters matched but we have characters, use all of them
    // This ensures character consistency even when names aren't explicitly mentioned
    if (relevantCharacters.length === 0 && characters && characters.length > 0) {
      console.warn('⚠️ No characters matched by name filtering. Using ALL characters as fallback.');
      relevantCharacters = characters;
    }

    // Find which backgrounds are actually mentioned in this specific scene
    let relevantBackgrounds = (backgrounds || []).filter((bg: any) =>
      bg.name.trim() &&
      new RegExp(`\\b${bg.name.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i').test(sceneDescription)
    );

    // FALLBACK: If no backgrounds matched but we have backgrounds, use all of them
    if (relevantBackgrounds.length === 0 && backgrounds && backgrounds.length > 0) {
      console.warn('⚠️ No backgrounds matched by name filtering. Using ALL backgrounds as fallback.');
      relevantBackgrounds = backgrounds;
    }

    console.log('\n' + '='.repeat(100));
    console.log('🎯 FINAL REFERENCE SELECTION');
    console.log('='.repeat(100));
    console.log('👥 Characters to use:', relevantCharacters.length);
    relevantCharacters.forEach((char: any, idx: number) => {
      console.log(`   ${idx + 1}. ${char.name} - has image: ${!!char.image}, has description: ${!!char.description}`);
    });

    console.log('🏞️  Backgrounds to use:', relevantBackgrounds.length);
    relevantBackgrounds.forEach((bg: any, idx: number) => {
      console.log(`   ${idx + 1}. ${bg.name} - has image: ${!!bg.image}, has description: ${!!bg.description}`);
    });

    console.log('🎨 Art Style:', artStyle ? 'YES' : 'NO');
    if (artStyle) {
      console.log(`   Has description: ${!!artStyleDescription}`);
    }

    console.log('='.repeat(100) + '\n');

    const parts: any[] = [];

    const shotTypeInstruction = shotType && shotType !== 'automatic'
      ? `Composition: Use a **${shotType.replace(/_/g, ' ')}** for this scene.`
      : '';

    // Use structured description if available, otherwise fall back to plain text
    const scenePrompt = structuredDescription
      ? createDetailedScenePrompt(structuredDescription)
      : `Scene Description: "${sceneDescription}"`;

    parts.push(
      { text: `Your task is to create a single, cohesive illustration for the following scene description. You MUST use the provided reference images to maintain PERFECT CONSISTENCY across all generated scenes.

${shotTypeInstruction}

${scenePrompt}

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

This character's appearance is NON-NEGOTIABLE and OVERRIDES ALL other references.
🔒 THIS CHARACTER'S FEATURES ARE LOCKED AND CANNOT BE CHANGED 🔒
${characterDescriptionText}

**MANDATORY: Study and memorize these UNCHANGEABLE features:**

📍 **HAIR (🔒 LOCKED - NEVER CHANGE):**
   • EXACT hair color from THIS image (NOT from any art style reference)
   • Hair style, cut, and length
   • Special features (dip-dye, highlights, hair accessories)
   • Bangs, texture, and styling
   🚨 **This hair color is PERMANENT for this character across ALL scenes**

📍 **EYES (🔒 LOCKED - NEVER CHANGE):**
   • EXACT eye color from THIS image (NOT from any art style reference)
   • Eye shape and size
   • Expression and gaze direction
   🚨 **This eye color is PERMANENT for this character across ALL scenes**

📍 **CLOTHING & ACCESSORIES (🔒 LOCKED - NEVER CHANGE):**
   • EXACT outfit and colors from THIS image
   • Glasses, jewelry, or other accessories
   • Any text on clothing
   • Distinctive items
   🚨 **This outfit is PERMANENT for this character across ALL scenes**

📍 **FACE & SKIN:**
   • Exact skin tone
   • Face shape and structure
   • Facial features (nose, mouth, eyebrows)
   • Any marks, freckles, or distinctive features

📍 **BODY & BUILD:**
   • Body proportions and type
   • Posture and stance

**YOUR ABSOLUTE REQUIREMENTS:**
1. **FIRST**: Study this reference image and description thoroughly
2. **MEMORIZE**: Every specific detail - ESPECIALLY hair color, eye color, and outfit
3. **WHEN DRAWING**: Replicate these features with 100% accuracy
4. **IF UNCERTAIN**: Refer back to THIS reference, NEVER to the art style reference
5. **REMEMBER**: This is the SAME character appearing in different scenes

**🚨 CRITICAL CHECKS BEFORE GENERATING:**
- Does my character have the EXACT SAME hair color as THIS reference? (NOT art style)
- Does my character have the EXACT SAME eye color as THIS reference? (NOT art style)
- Does my character have the EXACT SAME outfit as THIS reference? (NOT art style)
- If ANY answer is "no", STOP and study THIS reference again.

**WARNING:** If you see an "art style reference" image later with different hair/clothes:
→ IGNORE that character's appearance completely!
→ ONLY use that image's drawing technique!
→ THIS character's appearance NEVER changes!

The character's appearance is SACRED and PERMANENT. This is NON-NEGOTIABLE.
` });
        parts.push({ inlineData: { mimeType: char.image.mimeType, data: char.image.base64 } });
      }
    });

    // ============================================================================
    // NOW ADD ART STYLE REFERENCE (TECHNIQUE ONLY, NOT CHARACTER APPEARANCE)
    // ============================================================================

    console.log('\n' + '='.repeat(100));
    console.log('🎨 ART STYLE PROCESSING');
    console.log('='.repeat(100));
    console.log('artStyle exists?', !!artStyle);
    console.log('artStyle type:', artStyle ? typeof artStyle : 'null/undefined');
    if (artStyle) {
      console.log('artStyle.mimeType:', artStyle.mimeType);
      console.log('artStyle.base64 length:', artStyle.base64?.length || 0);
      console.log('artStyleDescription exists?', !!artStyleDescription);
      console.log('artStyleDescription length:', artStyleDescription?.length || 0);
    }
    console.log('='.repeat(100) + '\n');

    if (artStyle) {
      console.log('✅ Art style will be added to parts array');

      // Include detailed text description if available (from AI analysis)
      const artStyleDescriptionText = artStyleDescription
        ? `\n\n📋 **DETAILED ART STYLE DESCRIPTION (EXTRACTED BY AI):**\n${artStyleDescription}\n\n⚠️ **This description provides exact details about the artistic TECHNIQUE ONLY. Follow it PRECISELY.**`
        : '';

      parts.push({ text: `
═══════════════════════════════════════
🎨 ART STYLE REFERENCE (TECHNIQUE ONLY)
═══════════════════════════════════════

🚨🚨🚨 **CRITICAL WARNING** 🚨🚨🚨
This reference shows HOW to draw, NOT WHAT to draw!
IF there are people/characters in this art style reference image:
• **IGNORE their hair color completely** - Use ONLY the character reference hair color
• **IGNORE their clothing completely** - Use ONLY the character reference clothing
• **IGNORE their accessories completely** - Use ONLY the character reference accessories
• **IGNORE their eye color completely** - Use ONLY the character reference eye color
${artStyleDescriptionText}

**WHAT TO COPY FROM THIS REFERENCE (TECHNIQUE ONLY):**
✅ Line work style (thin/thick, clean/sketchy)
✅ How shading is applied (cell/gradient/painterly)
✅ How colors blend and transition
✅ Brush stroke texture and rendering style
✅ Lighting and shadow technique
✅ Overall polish level (sketchy vs polished)
✅ Background rendering style

**WHAT TO ABSOLUTELY NEVER COPY (CHARACTER FEATURES):**
❌ Hair color or style of people in this image
❌ Clothing or outfits of people in this image
❌ Eye color of people in this image
❌ Accessories or jewelry of people in this image
❌ Skin tone of people in this image
❌ Body proportions of people in this image

**EXAMPLE OF CORRECT APPLICATION:**
If art style shows: person with blue hair and futuristic clothes using smooth digital shading
And character reference shows: person with brown hair and maid outfit
You should draw: person with BROWN HAIR and MAID OUTFIT using SMOOTH DIGITAL SHADING

**YOUR MANDATORY STEPS:**
1. Look at CHARACTER reference → Remember: brown hair, maid outfit, amber eyes
2. Look at THIS art style → Remember: smooth shading technique, clean lines
3. Draw: Character with brown hair & maid outfit, rendered with smooth shading & clean lines
4. **NEVER**: Draw character with different hair/clothes from art style reference

**FINAL CHECK:**
- Am I copying the DRAWING TECHNIQUE from this reference? ✓
- Am I copying any HAIR COLOR from this reference? ✗ (FORBIDDEN)
- Am I copying any CLOTHING from this reference? ✗ (FORBIDDEN)
` });

      console.log('📝 Adding art style image to parts array...');
      console.log('   mimeType:', artStyle.mimeType);
      console.log('   base64 length:', artStyle.base64?.length || 0);

      parts.push({ inlineData: { mimeType: artStyle.mimeType, data: artStyle.base64 } });

      console.log('✅ Art style image added to parts array');
    } else {
      console.log('⚠️ No art style provided - skipping art style reference');
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

Before you generate the image, MANDATORY verification:

**CHARACTER APPEARANCE (from CHARACTER reference ONLY):**
✓ I have the EXACT hair color from the CHARACTER reference (NOT art style)
✓ I have the EXACT eye color from the CHARACTER reference (NOT art style)
✓ I have the EXACT outfit from the CHARACTER reference (NOT art style)
✓ I have the EXACT accessories from the CHARACTER reference (NOT art style)

**TECHNIQUE APPLICATION (from ART STYLE reference):**
✓ I am using the DRAWING TECHNIQUE from art style reference
✓ I am using the SHADING STYLE from art style reference
✓ I am using the LINE WORK style from art style reference

**CRITICAL DOUBLE-CHECK:**
❌ Did I accidentally copy hair color from art style image? → STOP and fix!
❌ Did I accidentally copy clothing from art style image? → STOP and fix!
❌ Did I accidentally copy accessories from art style image? → STOP and fix!

**CORRECT MENTAL MODEL:**
"I am drawing the CHARACTER from the character reference,
using the DRAWING TECHNIQUE from the art style reference.
The character's appearance stays the same, only the drawing technique changes."

**Remember: The character's APPEARANCE (hair, eyes, clothes) comes from CHARACTER reference.
The drawing TECHNIQUE (lines, shading, rendering) comes from ART STYLE reference.**
` });
    }

    // Extract text parts for logging/debugging
    const textPrompt = parts
      .filter((p: any) => p.text)
      .map((p: any) => p.text)
      .join('\n\n');

    console.log('\n' + '='.repeat(100));
    console.log('📦 PARTS ARRAY STRUCTURE');
    console.log('='.repeat(100));
    console.log('Total parts:', parts.length);
    parts.forEach((part, idx) => {
      if (part.text) {
        console.log(`Part ${idx + 1}: TEXT (${part.text.length} chars)`);
        console.log('   Preview:', part.text.substring(0, 150).replace(/\n/g, ' ') + '...');
      } else if (part.inlineData) {
        console.log(`Part ${idx + 1}: IMAGE`);
        console.log('   MimeType:', part.inlineData.mimeType);
        console.log('   Data size:', part.inlineData.data?.length || 0, 'chars');
      }
    });
    console.log('='.repeat(100) + '\n');

    console.log('\n' + '='.repeat(100));
    console.log('📝 FULL TEXT PROMPT being sent to Gemini:');
    console.log('='.repeat(100));
    console.log(textPrompt);
    console.log('='.repeat(100) + '\n');

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
