import { GoogleGenAI, Type } from "@google/genai";

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
            text: `Analyze this character image and provide a STRUCTURED JSON description focusing on key visual characteristics needed for consistent recreation.

**OUTPUT A JSON OBJECT with the following structure:**

{
  "face": {
    "age": "Apparent age in years (e.g., 'late teens', '25-30 years old', 'early 40s')",
    "shape": "Face shape (oval/round/square/heart/etc.)",
    "skinTone": "Specific skin tone description",
    "eyes": {
      "color": "Specific eye color with shade",
      "shape": "Eye shape (almond/round/narrow/etc.)",
      "size": "Relative size (large/medium/small)"
    },
    "nose": "Nose description (small/refined/prominent/etc.)",
    "mouth": "Mouth description (full lips/thin lips/etc.)",
    "distinctiveMarks": ["array", "of", "marks", "scars", "freckles"] // optional, omit if none
  },
  "hair": {
    "color": "Specific hair color with shade and variations",
    "length": "Hair length (very short/short/shoulder-length/long/very long)",
    "style": "Hair style (straight/wavy/curly/etc.)",
    "parting": "Hair parting (center/side/no parting/etc.)",
    "texture": "Hair texture",
    "accessories": ["array", "of", "hair", "accessories"] // optional, omit if none
  },
  "body": {
    "build": "Body build (slender/athletic/muscular/curvy/etc.)",
    "height": "Relative height (tall/average/short)",
    "posture": "Posture description (upright/relaxed/slouched/etc.)"
  },
  "outfit": {
    "upperBody": "Upper body clothing description",
    "lowerBody": "Lower body clothing description",
    "accessories": ["array", "of", "clothing", "accessories"],
    "colors": ["dominant", "outfit", "colors"],
    "style": "Overall outfit style (casual/formal/school uniform/maid outfit/etc.)"
  },
  "overallVibe": "Overall personality impression and vibe in one sentence"
}

**IMPORTANT:**
- Be SPECIFIC with colors (use shades: "warm amber-brown" not just "brown")
- Focus on what an artist needs for consistency
- Omit optional arrays if they're empty (distinctiveMarks, hair.accessories)
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
            face: {
              type: Type.OBJECT,
              properties: {
                shape: { type: Type.STRING },
                age: { type: Type.STRING },
                skinTone: { type: Type.STRING },
                eyes: {
                  type: Type.OBJECT,
                  properties: {
                    color: { type: Type.STRING },
                    shape: { type: Type.STRING },
                    size: { type: Type.STRING }
                  },
                  required: ["color", "shape", "size"]
                },
                nose: { type: Type.STRING },
                mouth: { type: Type.STRING },
                distinctiveMarks: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                }
              },
              required: ["shape", "age", "skinTone", "eyes", "nose", "mouth"]
            },
            hair: {
              type: Type.OBJECT,
              properties: {
                color: { type: Type.STRING },
                length: { type: Type.STRING },
                style: { type: Type.STRING },
                parting: { type: Type.STRING },
                texture: { type: Type.STRING },
                accessories: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                }
              },
              required: ["color", "length", "style", "parting", "texture"]
            },
            body: {
              type: Type.OBJECT,
              properties: {
                build: { type: Type.STRING },
                height: { type: Type.STRING },
                posture: { type: Type.STRING }
              },
              required: ["build", "height", "posture"]
            },
            outfit: {
              type: Type.OBJECT,
              properties: {
                upperBody: { type: Type.STRING },
                lowerBody: { type: Type.STRING },
                accessories: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                },
                colors: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                },
                style: { type: Type.STRING }
              },
              required: ["upperBody", "lowerBody", "accessories", "colors", "style"]
            },
            overallVibe: { type: Type.STRING }
          },
          required: ["face", "hair", "body", "outfit", "overallVibe"]
        }
      }
    });

    const jsonString = response.text;
    const structuredAnalysis = JSON.parse(jsonString);

    // Also generate a legacy text description for backward compatibility
    const legacyDescription = `**AGE:** ${structuredAnalysis.face.age}.
**FACE & EYES:** ${structuredAnalysis.face.eyes.color} eyes, ${structuredAnalysis.face.skinTone} skin, ${structuredAnalysis.face.shape} face shape.
**HAIR:** ${structuredAnalysis.hair.color} hair, ${structuredAnalysis.hair.length} and ${structuredAnalysis.hair.style}, parted in the ${structuredAnalysis.hair.parting}.
**BODY & BUILD:** ${structuredAnalysis.body.build} build, appears of ${structuredAnalysis.body.height} height with a ${structuredAnalysis.body.posture} posture.
**MAIN OUTFIT:** ${structuredAnalysis.outfit.upperBody} and ${structuredAnalysis.outfit.lowerBody}.
**DISTINCTIVE ACCESSORIES:** ${structuredAnalysis.outfit.accessories.join(', ')}.
**OVERALL VIBE:** ${structuredAnalysis.overallVibe}`;

    return res.status(200).json({
      description: legacyDescription,
      structuredAnalysis: structuredAnalysis
    });

  } catch (error: any) {
    console.error("Error analyzing character:", error);
    return res.status(500).json({ error: error.message || 'Failed to analyze character' });
  }
}
