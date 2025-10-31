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
            text: `Analyze this art style reference and provide a CONCISE description focusing ONLY on the drawing technique and artistic style. Keep it brief and practical for artists to reference.

🚨 **CRITICAL RULES:**
- **IGNORE** any characters, people, or figures in the image
- **DO NOT** describe hair colors, eye colors, clothing, accessories, or character features
- **FOCUS ONLY** on HOW the art is created, NOT what is depicted
- Extract ONLY the technique, not the subject matter

**FORMAT YOUR RESPONSE (Keep each section to 1-2 sentences):**

**MEDIUM & TECHNIQUE:**
[Identify: watercolor/digital/oil/pencil, traditional/digital, visible brushwork or smooth rendering]

**LINE WORK:**
[Describe: line thickness, style (clean/sketchy/minimal/bold), and outline treatment - NOT what the lines draw]

**COLOR APPLICATION:**
[Describe: how colors are applied (gradient/flat/textured), saturation level (vibrant/muted), contrast approach - NOT specific colors of characters]

**SHADING & LIGHTING:**
[Describe: shading technique (cell shading/gradient/realistic/painterly), shadow rendering style, contrast level]

**STYLE GENRE:**
[Identify: anime/manga/western comic/realistic/impressionist/painterly/etc., and stylization level]

**MOOD:**
[One sentence: overall atmosphere created by the artistic technique]

**KEY DISTINCTIVE FEATURES:**
[1-2 unique TECHNICAL characteristics - e.g., "soft airbrush gradients with minimal outlines", "bold cell shading with high contrast"]

**IMPORTANT:** Focus on technique ONLY. For example:
✅ GOOD: "Smooth digital rendering with soft gradient shading. Clean thin outlines. High contrast between light and shadow."
❌ BAD: "Character has pink hair and holographic jacket"

Remember: You are analyzing HOW to draw, not WHAT is drawn.`
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
