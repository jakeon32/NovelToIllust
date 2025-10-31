import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
const visionModel = "gemini-2.5-flash";

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { image } = req.body;

  if (!image) {
    return res.status(400).json({ error: 'Art style image is required' });
  }

  try {
    const response = await ai.models.generateContent({
      model: visionModel,
      contents: {
        parts: [
          {
            text: `Analyze this art style reference image in extreme detail. Extract EVERY artistic technique and visual characteristic that would be needed to recreate artwork in this exact same style.

**YOUR TASK:** Create a comprehensive art style description that captures EVERY stylistic element.

**FORMAT YOUR RESPONSE AS A STRUCTURED LIST:**

**ARTISTIC MEDIUM & TECHNIQUE:**
- Medium: [watercolor, oil painting, digital art, pencil sketch, etc.]
- Technique: [traditional, digital, mixed media, etc.]
- Finish: [rough, polished, textured, smooth, etc.]
- Tool marks: [visible brush strokes, pen lines, pixel art, etc.]

**LINE WORK:**
- Line style: [clean, sketchy, bold, delicate, etc.]
- Line weight: [uniform, varied, thick, thin, etc.]
- Line quality: [smooth, rough, broken, continuous, etc.]
- Outline presence: [strong outlines, no outlines, partial outlines, etc.]

**COLOR PALETTE:**
- Overall palette: [vibrant, muted, pastel, monochrome, limited, full spectrum, etc.]
- Dominant colors: [list main colors with specific shades]
- Color harmony: [complementary, analogous, triadic, etc.]
- Color temperature: [warm, cool, neutral, mixed, etc.]
- Saturation level: [highly saturated, desaturated, varied, etc.]

**SHADING & LIGHTING:**
- Shading technique: [cell shading, soft gradient, hard shadows, no shading, etc.]
- Shadow style: [realistic, stylized, minimal, dramatic, etc.]
- Highlight style: [sharp, soft, specular, diffuse, etc.]
- Light source: [clear directional, ambient, dramatic, flat, etc.]
- Value range: [high contrast, low contrast, full range, limited range, etc.]

**TEXTURE & DETAIL:**
- Texture level: [highly textured, smooth, varied, etc.]
- Detail density: [highly detailed, simplified, selective detail, etc.]
- Surface quality: [rough, smooth, grainy, clean, etc.]
- Pattern usage: [heavy patterns, minimal, ornate, simple, etc.]

**COMPOSITION & STYLE:**
- Composition approach: [balanced, dynamic, static, asymmetric, etc.]
- Perspective: [realistic, stylized, flat, isometric, etc.]
- Proportions: [realistic, exaggerated, chibi, elongated, etc.]
- Stylization level: [highly realistic, semi-realistic, stylized, abstract, etc.]

**ARTISTIC INFLUENCES:**
- Art style genre: [anime, manga, western comic, renaissance, impressionist, etc.]
- Cultural influence: [Japanese, Western, Eastern, etc.]
- Era/period: [modern, classic, retro, contemporary, etc.]
- Similar artists/styles: [if recognizable]

**MOOD & ATMOSPHERE:**
- Overall mood: [cheerful, dark, dreamy, energetic, calm, etc.]
- Atmosphere: [light and airy, heavy and dense, ethereal, grounded, etc.]
- Emotional tone: [warm, cold, inviting, distant, etc.]

**TECHNICAL EXECUTION:**
- Rendering quality: [professional, sketch-like, polished, rough, etc.]
- Blending: [smooth blending, hard edges, no blending, etc.]
- Edge treatment: [soft, sharp, varied, lost edges, etc.]
- Brushwork visibility: [visible strokes, smooth finish, textured, etc.]

**SPECIAL CHARACTERISTICS:**
- Unique features: [any distinctive techniques or hallmarks]
- Signature elements: [recurring visual motifs or patterns]
- Special effects: [glow, blur, grain, halftone, etc.]

**IMPORTANT:** Be EXTREMELY specific with every aspect. Instead of "colorful", say "vibrant saturated colors with emphasis on warm reds and oranges contrasted with cool blues". Instead of "nice shading", say "soft gradient cell shading with distinct but smooth transitions between light and shadow, using a cool-toned light source from upper left".`
          },
          {
            inlineData: {
              mimeType: image.mimeType,
              data: image.base64
            }
          }
        ]
      }
    });

    const artStyleDescription = response.candidates[0].content.parts[0].text;

    return res.status(200).json({ description: artStyleDescription });

  } catch (error: any) {
    console.error("Error analyzing art style:", error);
    return res.status(500).json({ error: error.message || 'Failed to analyze art style' });
  }
}
