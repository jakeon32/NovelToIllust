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
      parts.push({ text: "═══════════════════════════════════════\n🎨 ART STYLE REFERENCE (MANDATORY TO FOLLOW):\n═══════════════════════════════════════\n\nThis is your PRIMARY style reference. Every illustration MUST match this style EXACTLY. Study the line work, coloring technique, shading style, level of detail, and overall aesthetic. Your output MUST look like it was created by the same artist using the same technique." });
      parts.push({ inlineData: { mimeType: artStyle.mimeType, data: artStyle.base64 } });
    }

    if (backgrounds && backgrounds.length > 0) {
      backgrounds.forEach((bg: any, index: number) => {
        const label = backgrounds.length > 1
          ? `═══════════════════════════════════════\n🏞️ BACKGROUND REFERENCE ${index + 1} (MANDATORY TO FOLLOW):\n═══════════════════════════════════════\n\nAnalyze this background reference carefully. Note the architectural style, color palette, lighting mood, and environmental details. Your scene's setting MUST feel like it exists in this same world. Maintain consistency in style, atmosphere, and design language.`
          : "═══════════════════════════════════════\n🏞️ BACKGROUND REFERENCE (MANDATORY TO FOLLOW):\n═══════════════════════════════════════\n\nAnalyze this background reference carefully. Note the architectural style, color palette, lighting mood, and environmental details. Your scene's setting MUST feel like it exists in this same world. Maintain consistency in style, atmosphere, and design language.";
        parts.push({ text: label });
        parts.push({ inlineData: { mimeType: bg.image.mimeType, data: bg.image.base64 } });
      });
    }

    relevantCharacters.forEach((char: any) => {
      if (char.image) {
        parts.push({ text: `═══════════════════════════════════════\n👤 CHARACTER REFERENCE: "${char.name}" (CRITICAL - HIGHEST PRIORITY):\n═══════════════════════════════════════\n\n⚠️ THIS IS CRITICAL: Study this character's appearance in EXTREME DETAIL:\n• Hair: exact color, style, length, texture\n• Face: eye color/shape, nose, mouth, facial structure, skin tone\n• Body: build, height proportions\n• Clothing: specific garments, colors, accessories, style\n• Distinctive features: scars, tattoos, glasses, jewelry, etc.\n\nYou MUST draw THIS EXACT character. Think of them as a real person you're drawing from multiple angles. Every visual detail must match this reference PERFECTLY. The viewer must instantly recognize this as the same character. This is NON-NEGOTIABLE.` });
        parts.push({ inlineData: { mimeType: char.image.mimeType, data: char.image.base64 } });
      }
    });

    const response = await ai.models.generateContent({
      model: illustrationModel,
      contents: { parts },
      config: {
        responseModalities: [Modality.IMAGE],
        ...(aspectRatio && { aspectRatio }),
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
