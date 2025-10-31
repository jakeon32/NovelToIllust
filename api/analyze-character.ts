import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
const visionModel = "gemini-2.5-flash";

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { image } = req.body;

  if (!image) {
    return res.status(400).json({ error: 'Character image is required' });
  }

  try {
    const response = await ai.models.generateContent({
      model: visionModel,
      contents: {
        parts: [
          {
            text: `Analyze this character image and provide a CONCISE description focusing on key visual characteristics needed for consistent recreation. Keep it practical and scannable.

**FORMAT YOUR RESPONSE (Keep each section brief, 1-2 sentences max):**

**FACE & EYES:**
[Eye color (specific shade), skin tone, face shape. Note any distinctive facial features like marks or scars.]

**HAIR:**
[Color (specific shade), style, length. Include any unique color variations or accessories.]

**BODY & BUILD:**
[Overall build (slim/athletic/etc.), approximate height, posture if distinctive.]

**MAIN OUTFIT:**
[Top and bottom - colors and key style. Keep to essentials only.]

**DISTINCTIVE ACCESSORIES:**
[Only the most noticeable items: glasses, jewelry, bags. Skip if none.]

**UNIQUE IDENTIFIERS:**
[1-2 characteristics that make this character instantly recognizable. This is the most important section.]

**OVERALL VIBE:**
[One sentence: personality impression and typical expression.]

**EXAMPLE OUTPUT:**
"Bright sapphire blue eyes, fair skin, heart-shaped face. Shoulder-length golden blonde hair with honey highlights, straight with side-swept bangs. Slim build, average height. White button-up shirt, dark blue jeans. Black-rimmed round glasses, silver necklace. Instantly recognizable by: vibrant hair color and distinctive glasses. Professional yet approachable vibe, usually smiling warmly."

**IMPORTANT:** Be specific with colors and key features, but avoid over-describing minor details. Focus on what an artist needs to maintain consistency across multiple scenes.`
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

    const characterDescription = response.candidates[0].content.parts[0].text;

    return res.status(200).json({ description: characterDescription });

  } catch (error: any) {
    console.error("Error analyzing character:", error);
    return res.status(500).json({ error: error.message || 'Failed to analyze character' });
  }
}
