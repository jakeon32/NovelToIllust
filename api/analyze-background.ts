import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
const visionModel = "gemini-2.5-flash";

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { image } = req.body;

  if (!image) {
    return res.status(400).json({ error: 'Background image is required' });
  }

  try {
    const response = await ai.models.generateContent({
      model: visionModel,
      contents: {
        parts: [
          {
            text: `Analyze this background/setting image and provide a CONCISE description focusing on key environmental elements needed to recreate similar scenes. Keep it practical and scannable.

**FORMAT YOUR RESPONSE (Keep each section brief, 1-2 sentences max):**

**LOCATION TYPE & STYLE:**
[Setting type (castle/forest/room/etc.) and architectural/natural style. Be specific but concise.]

**KEY STRUCTURES & MATERIALS:**
[Main architectural elements or natural features. Materials if distinctive (stone/wood/etc.).]

**COLOR & LIGHTING:**
[Dominant colors (2-3), time of day, light sources, overall mood (warm/cool/etc.).]

**ATMOSPHERE & WEATHER:**
[Weather conditions, shadows (soft/harsh), mood (peaceful/ominous/etc.).]

**NOTABLE ELEMENTS:**
[Key furniture, decorations, or environmental details that define the space. Only the most important ones.]

**ERA & CULTURAL STYLE:**
[Time period, cultural influence, genre (fantasy/modern/historical/etc.).]

**UNIQUE IDENTIFIERS:**
[1-2 characteristics that make this setting instantly recognizable and distinctive.]

**EXAMPLE OUTPUT:**
"Grand Gothic library with stone walls and vaulted ceilings. Arched windows, dark wooden bookshelves, ornate fireplace. Warm golden afternoon light, amber and brown tones with cool grey stone. Clear weather, soft shadows, scholarly and peaceful mood. Floor-to-ceiling books, red velvet armchairs, crystal specimens on desk. Medieval-Renaissance European style, fantasy-academic genre. Instantly recognizable by: dramatic Gothic windows and extensive ancient book collection."

**IMPORTANT:** Focus on elements that would help an artist recreate the setting's atmosphere and style across multiple scenes. Avoid over-describing every detail - capture the essence.`
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

    const backgroundDescription = response.candidates[0].content.parts[0].text;

    return res.status(200).json({ description: backgroundDescription });

  } catch (error: any) {
    console.error("Error analyzing background:", error);
    return res.status(500).json({ error: error.message || 'Failed to analyze background' });
  }
}
