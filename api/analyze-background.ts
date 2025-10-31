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
            text: `Analyze this background/setting/location image in extreme detail. Extract EVERY visual characteristic that would be needed to recreate settings with the same atmosphere and style in different scenes.

**YOUR TASK:** Create a comprehensive background description that captures EVERY environmental detail.

**FORMAT YOUR RESPONSE AS A STRUCTURED LIST:**

**ARCHITECTURE & STRUCTURE:**
- Building style: [Gothic, Modern, Fantasy, Traditional, etc.]
- Key architectural elements: [columns, arches, windows, doors, roofs, etc.]
- Materials: [stone, wood, metal, glass, etc.]
- Scale: [intimate, grand, massive, cozy, etc.]
- Condition: [pristine, weathered, ancient, new, etc.]

**COLOR PALETTE:**
- Dominant colors: [list main colors with specific shades]
- Accent colors: [list secondary colors]
- Color temperature: [warm, cool, neutral]
- Color saturation: [vibrant, muted, pastel, etc.]

**LIGHTING & ATMOSPHERE:**
- Light source: [natural sunlight, moonlight, artificial, magical, etc.]
- Time of day: [dawn, midday, dusk, night]
- Weather/atmosphere: [clear, foggy, rainy, snowy, etc.]
- Mood: [peaceful, ominous, cheerful, mysterious, etc.]
- Shadows: [harsh, soft, long, minimal]

**ENVIRONMENTAL DETAILS:**
- Flora: [trees, plants, flowers, grass - describe types and placement]
- Terrain: [flat, hilly, mountainous, indoor floor, etc.]
- Water features: [river, lake, fountain, ocean, none]
- Sky: [clear, cloudy, starry, stormy - if visible]
- Ground/flooring: [grass, stone, wood, carpet, etc.]

**DECORATIVE ELEMENTS:**
- Furniture: [if indoor - describe style and placement]
- Decorations: [paintings, statues, banners, lights, etc.]
- Cultural style: [Medieval European, Asian, Futuristic, etc.]
- Ornamentation level: [minimal, moderate, elaborate]

**SPATIAL CHARACTERISTICS:**
- Depth: [shallow, deep, layered]
- Composition: [symmetrical, asymmetrical, centered, etc.]
- Perspective: [eye-level, bird's eye, low angle, etc.]
- Key focal points: [what draws the eye]

**GENRE & SETTING:**
- Setting type: [castle, forest, city street, room, battlefield, etc.]
- Era/time period: [medieval, modern, futuristic, timeless, etc.]
- Genre: [fantasy, sci-fi, realistic, historical, etc.]
- Cultural influence: [Western, Eastern, Mixed, Fictional, etc.]

**IMPORTANT:** Be EXTREMELY specific with colors and architectural details. Instead of "a castle", say "a Gothic medieval castle with pointed arch windows, flying buttresses, and gray stone walls with ivy growing on the eastern side". Instead of "nice lighting", say "warm golden hour sunlight streaming from the left, creating long shadows and illuminating dust particles in the air".`
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
