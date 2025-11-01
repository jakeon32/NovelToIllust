import { GoogleGenAI, Type } from "@google/genai";

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
            text: `Analyze this background/setting image and provide a STRUCTURED JSON description focusing on key environmental elements needed to recreate similar scenes.

**OUTPUT A JSON OBJECT with the following structure:**

{
  "location": {
    "type": "indoor/outdoor/mixed",
    "setting": "Specific setting description (e.g., 'antique study room', 'misty forest', 'modern cafe')",
    "architecture": "Architectural style or natural features"
  },
  "lighting": {
    "source": ["array", "of", "light", "sources"],
    "quality": "Light quality description (warm/cool/harsh/soft/etc.)",
    "timeOfDay": "morning/afternoon/evening/night/unclear",
    "mood": "Lighting mood (cozy/dramatic/mysterious/bright/etc.)"
  },
  "colors": {
    "dominant": ["dominant", "colors"],
    "accents": ["accent", "colors"],
    "palette": "Overall color palette description (e.g., 'warm earth tones', 'cool blues and greys')"
  },
  "objects": [
    {
      "item": "Object name",
      "description": "Brief description",
      "prominence": "foreground/midground/background"
    }
  ],
  "atmosphere": "Overall atmosphere and mood in one sentence"
}

**IMPORTANT:**
- Be SPECIFIC with colors
- Focus on what an artist needs for consistency
- List 3-5 most important objects
- Keep descriptions concise but precise`
          },
          {
            inlineData: {
              mimeType: image.mimeType,
              data: image.base64
            }
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            location: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING },
                setting: { type: Type.STRING },
                architecture: { type: Type.STRING }
              },
              required: ["type", "setting", "architecture"]
            },
            lighting: {
              type: Type.OBJECT,
              properties: {
                source: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                },
                quality: { type: Type.STRING },
                timeOfDay: { type: Type.STRING },
                mood: { type: Type.STRING }
              },
              required: ["source", "quality", "timeOfDay", "mood"]
            },
            colors: {
              type: Type.OBJECT,
              properties: {
                dominant: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                },
                accents: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                },
                palette: { type: Type.STRING }
              },
              required: ["dominant", "accents", "palette"]
            },
            objects: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  item: { type: Type.STRING },
                  description: { type: Type.STRING },
                  prominence: { type: Type.STRING }
                },
                required: ["item", "description", "prominence"]
              }
            },
            atmosphere: { type: Type.STRING }
          },
          required: ["location", "lighting", "colors", "objects", "atmosphere"]
        }
      }
    });

    const jsonString = response.text;
    const structuredAnalysis = JSON.parse(jsonString);

    // Generate legacy text description for backward compatibility
    const legacyDescription = `**LOCATION:** ${structuredAnalysis.location.setting} (${structuredAnalysis.location.type}), ${structuredAnalysis.location.architecture}.
**LIGHTING:** ${structuredAnalysis.lighting.source.join(', ')} with ${structuredAnalysis.lighting.quality} quality during ${structuredAnalysis.lighting.timeOfDay}. Mood: ${structuredAnalysis.lighting.mood}.
**COLORS:** ${structuredAnalysis.colors.dominant.join(', ')} with ${structuredAnalysis.colors.accents.join(', ')} accents. Overall palette: ${structuredAnalysis.colors.palette}.
**KEY OBJECTS:** ${structuredAnalysis.objects.map((obj: any) => `${obj.item} (${obj.prominence})`).join(', ')}.
**ATMOSPHERE:** ${structuredAnalysis.atmosphere}`;

    return res.status(200).json({
      description: legacyDescription,
      structuredAnalysis: structuredAnalysis
    });

  } catch (error: any) {
    console.error("Error analyzing background:", error);
    return res.status(500).json({ error: error.message || 'Failed to analyze background' });
  }
}
