import { GoogleGenAI, Modality } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
const illustrationModel = "gemini-2.5-flash-image";

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { sceneDescription, characters, backgrounds, artStyle, shotType, aspectRatio } = req.body;

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
**🎨 ABSOLUTE CONSISTENCY REQUIREMENTS:**
**━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━**

**1. ART STYLE CONSISTENCY (MANDATORY):**
   • You WILL be provided with an art style reference image
   • EVERY aspect must match: line work thickness, shading technique, color palette, brush strokes, texture
   • Study the reference carefully: note the level of detail, contrast, saturation, and artistic technique
   • This is NOT a suggestion - the art style MUST be IDENTICAL to the reference
   • If the reference is watercolor, use watercolor. If it's digital art, use digital art style
   • Maintain the EXACT same level of realism/stylization as shown in the reference

**2. BACKGROUND/SETTING CONSISTENCY (MANDATORY):**
   • You WILL be provided with background reference image(s)
   • Identify key elements: architecture style, color scheme, lighting mood, environmental details
   • The setting in your illustration MUST feel like it belongs in the same world as the reference
   • Reuse architectural elements, color palettes, and atmospheric qualities from the reference
   • If the reference shows a fantasy castle, maintain that medieval fantasy aesthetic
   • Environmental consistency is KEY for immersion

**3. CHARACTER CONSISTENCY (HIGHEST PRIORITY - CRITICAL):**
   • You WILL be provided with character reference images for characters mentioned in this scene
   • BEFORE drawing, carefully analyze EVERY visual detail of each character:
     - Exact hair color, style, and length
     - Precise eye color and shape
     - Facial structure and features
     - Body type and build
     - Clothing style, colors, and specific garments
     - Any distinctive marks: scars, tattoos, accessories
   • Your illustration MUST replicate these features with 100% ACCURACY
   • Character appearance must be IDENTICAL to the reference - this is NON-NEGOTIABLE
   • Think of this as drawing the SAME character in a new pose/situation
   • Only draw characters explicitly mentioned in the scene description
   • If NO characters are mentioned, create an environment-focused illustration

**4. VISUAL CONSISTENCY ACROSS SCENES:**
   • Remember: These images will be viewed together as a sequence
   • Use the SAME color grading and lighting style as established in references
   • Maintain the SAME level of detail throughout
   • Keep the SAME artistic quality and finish
   • The viewer should immediately recognize this as part of the same story

**━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━**
**⚠️ CRITICAL REMINDERS:**
**━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━**

• STUDY each reference image carefully before drawing
• When in doubt, refer back to the references
• Consistency > Creativity - match the references precisely
• This scene is part of a visual narrative - maintain continuity
• Your goal: Make it look like the same artist drew all scenes using the same characters in the same world
`
      }
    );

    if (artStyle) {
      parts.push({ text: "═══════════════════════════════════════\n🎨 ART STYLE REFERENCE (STYLE ONLY - NOT CHARACTER):\n═══════════════════════════════════════\n\n⚠️ IMPORTANT: This reference is ONLY for artistic style, NOT for character appearance!\n\n**USE FROM THIS REFERENCE:**\n• Line work thickness and quality\n• Coloring technique (digital, watercolor, oil painting, etc.)\n• Shading and lighting style\n• Color palette and saturation levels\n• Brush strokes and texture\n• Level of detail and realism\n• Overall artistic mood and atmosphere\n\n**COMPLETELY IGNORE FROM THIS REFERENCE:**\n• Any people, characters, or figures shown\n• Facial features or body types of any person\n• Clothing or character designs\n\n**Your task:** Extract ONLY the artistic technique and apply it to the characters provided separately below. Think of this as learning the artist's technique, NOT copying their subjects." });
      parts.push({ inlineData: { mimeType: artStyle.mimeType, data: artStyle.base64 } });
    }

    if (relevantBackgrounds && relevantBackgrounds.length > 0) {
      relevantBackgrounds.forEach((bg: any, index: number) => {
        const label = relevantBackgrounds.length > 1
          ? `═══════════════════════════════════════\n🏞️ BACKGROUND REFERENCE ${index + 1}: "${bg.name}" (MANDATORY TO FOLLOW):\n═══════════════════════════════════════\n\nThis is the reference for "${bg.name}" mentioned in the scene. Analyze this background reference carefully. Note the architectural style, color palette, lighting mood, and environmental details. Your scene's setting MUST feel like it exists in this same world. Maintain consistency in style, atmosphere, and design language.`
          : `═══════════════════════════════════════\n🏞️ BACKGROUND REFERENCE: "${bg.name}" (MANDATORY TO FOLLOW):\n═══════════════════════════════════════\n\nThis is the reference for "${bg.name}" mentioned in the scene. Analyze this background reference carefully. Note the architectural style, color palette, lighting mood, and environmental details. Your scene's setting MUST feel like it exists in this same world. Maintain consistency in style, atmosphere, and design language.`;
        parts.push({ text: label });
        parts.push({ inlineData: { mimeType: bg.image.mimeType, data: bg.image.base64 } });
      });
    }

    relevantCharacters.forEach((char: any) => {
      if (char.image) {
        parts.push({ text: `═══════════════════════════════════════\n👤 CHARACTER REFERENCE: "${char.name}" (⚠️ ABSOLUTE HIGHEST PRIORITY - OVERRIDES EVERYTHING):\n═══════════════════════════════════════\n\n🚨 **CRITICAL INSTRUCTION - READ CAREFULLY:**\n\nThis character reference has ABSOLUTE PRIORITY over the art style reference above!\n\n**IF there were any people/characters in the art style reference, COMPLETELY IGNORE THEM.**\n**The character you draw MUST be from THIS reference ONLY, NOT from the art style image!**\n\n**MANDATORY CHARACTER ANALYSIS - Study EVERY detail:**\n\n📍 **FACE (HIGHEST PRIORITY):**\n   • Eye color, shape, and expression\n   • Eyebrow shape and color\n   • Nose shape and size\n   • Mouth shape and lip color\n   • Face shape and structure\n   • Skin tone (exact shade)\n   • Any facial marks, freckles, or beauty marks\n\n📍 **HAIR (CRITICAL):**\n   • Exact color (if blonde, what shade? if brown, light or dark?)\n   • Hair style and cut\n   • Hair length\n   • Hair texture (straight, wavy, curly)\n   • Bangs or no bangs\n   • Hair accessories\n\n📍 **BODY & BUILD:**\n   • Height and body proportions\n   • Body type (slim, athletic, etc.)\n   • Posture and body language\n\n📍 **CLOTHING & ACCESSORIES:**\n   • Exact outfit (every piece of clothing)\n   • Clothing colors (specific shades)\n   • Accessories (jewelry, glasses, hats, etc.)\n   • Clothing style (casual, formal, fantasy, etc.)\n\n📍 **DISTINCTIVE FEATURES:**\n   • Scars, tattoos, birthmarks\n   • Unique characteristics\n   • Special items they always carry\n\n**YOUR TASK:**\n1. Memorize EVERY visual detail of THIS character from THIS image\n2. Apply the ART STYLE (colors, lines, shading) from the style reference\n3. But draw THIS EXACT CHARACTER's appearance, NOT any character from the style reference\n4. Think: "Same person, different artistic technique"\n\n**FINAL CHECK:** Does your character match THIS reference image in every detail? If not, REDO IT.\n\nThis is NON-NEGOTIABLE. The character's appearance is SACRED.` });
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
          image: `data:${part.inlineData.mimeType};base64,${base64ImageBytes}`
        });
      }
    }

    throw new Error("No image was generated by the API.");

  } catch (error: any) {
    console.error("Error generating illustration:", error);
    return res.status(500).json({ error: error.message || 'Failed to generate illustration' });
  }
}
