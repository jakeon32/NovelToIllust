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
            text: `Analyze this art style reference and provide a CONCISE description focusing on the most important stylistic elements. Keep it brief and practical for artists to reference.

**FORMAT YOUR RESPONSE (Keep each section to 1-2 sentences):**

**MEDIUM & TECHNIQUE:**
[Identify: watercolor/digital/oil/pencil, traditional/digital, visible brushwork or smooth]

**LINE WORK:**
[Describe: line thickness, style (clean/sketchy), and outline presence]

**COLOR:**
[Describe: overall palette (vibrant/muted/pastel), 2-3 dominant colors, warm/cool temperature]

**SHADING & LIGHTING:**
[Describe: shading technique (cell shading/gradient/realistic), shadow style, contrast level]

**STYLE GENRE:**
[Identify: anime/manga/western comic/realistic/impressionist/etc., and stylization level]

**MOOD:**
[One sentence: overall atmosphere and emotional tone]

**KEY DISTINCTIVE FEATURES:**
[1-2 unique characteristics that define this style]

**IMPORTANT:** Be specific but concise. Instead of listing everything, focus on what makes this style unique and recognizable. For example: "Vibrant digital art with bold, thick outlines. Saturated warm colors (oranges, reds) contrasted with cool blues. Cell shading with strong shadows. Anime-inspired with slightly exaggerated proportions. Energetic and cheerful mood."`
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
