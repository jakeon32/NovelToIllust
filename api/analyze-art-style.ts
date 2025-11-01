import { GoogleGenAI, Type } from "@google/genai";

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
            text: `Analyze this art style reference and provide a STRUCTURED JSON description focusing ONLY on the drawing technique and artistic style.

🚨 **CRITICAL RULES:**
- **IGNORE** any characters, people, or figures in the image
- **DO NOT** describe hair colors, eye colors, clothing, accessories, or character features
- **FOCUS ONLY** on HOW the art is created, NOT what is depicted
- Extract ONLY the technique, not the subject matter

**OUTPUT A JSON OBJECT with the following structure:**

{
  "medium": "The medium (digital painting/watercolor/oil/pencil/etc.)",
  "technique": {
    "rendering": "How it's rendered (smooth airbrush/visible brushwork/sketchy/etc.)",
    "lineWork": "Line work description (minimal/bold/clean/sketchy/absent/etc.)",
    "edgeQuality": "Edge quality (soft/sharp/clean/rough/etc.)"
  },
  "colorApplication": {
    "style": "How colors are applied (smooth gradients/flat/textured/etc.)",
    "saturation": "Saturation approach (vibrant/muted/high on focal areas/etc.)",
    "blending": "How colors blend (subtle transitions/hard edges/etc.)"
  },
  "shadingAndLighting": {
    "shadingStyle": "Shading technique (soft volumetric/cell shading/realistic/painterly/etc.)",
    "contrast": "Contrast level (low/moderate/high)",
    "lightingType": "Lighting approach (gentle ambient/dramatic/soft/harsh/etc.)"
  },
  "styleGenre": "Overall genre (anime/manga/western comic/realistic/semi-realistic/impressionist/etc.)",
  "mood": "Overall mood created by the artistic technique",
  "distinctiveFeatures": ["array", "of", "unique", "technical", "characteristics"]
}

**IMPORTANT:**
- Focus on TECHNIQUE ONLY
- Be specific and concise
- List 2-4 distinctive features
- Describe HOW to draw, not WHAT is drawn`
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
            medium: { type: Type.STRING },
            technique: {
              type: Type.OBJECT,
              properties: {
                rendering: { type: Type.STRING },
                lineWork: { type: Type.STRING },
                edgeQuality: { type: Type.STRING }
              },
              required: ["rendering", "lineWork", "edgeQuality"]
            },
            colorApplication: {
              type: Type.OBJECT,
              properties: {
                style: { type: Type.STRING },
                saturation: { type: Type.STRING },
                blending: { type: Type.STRING }
              },
              required: ["style", "saturation", "blending"]
            },
            shadingAndLighting: {
              type: Type.OBJECT,
              properties: {
                shadingStyle: { type: Type.STRING },
                contrast: { type: Type.STRING },
                lightingType: { type: Type.STRING }
              },
              required: ["shadingStyle", "contrast", "lightingType"]
            },
            styleGenre: { type: Type.STRING },
            mood: { type: Type.STRING },
            distinctiveFeatures: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["medium", "technique", "colorApplication", "shadingAndLighting", "styleGenre", "mood", "distinctiveFeatures"]
        }
      }
    });

    const jsonString = response.text;
    const structuredAnalysis = JSON.parse(jsonString);

    // Generate legacy text description for backward compatibility
    const legacyDescription = `**MEDIUM & TECHNIQUE:**
${structuredAnalysis.medium}, utilizing ${structuredAnalysis.technique.rendering}. Line work: ${structuredAnalysis.technique.lineWork}. Edges: ${structuredAnalysis.technique.edgeQuality}.

**COLOR APPLICATION:**
${structuredAnalysis.colorApplication.style}. Saturation: ${structuredAnalysis.colorApplication.saturation}. Blending: ${structuredAnalysis.colorApplication.blending}.

**SHADING & LIGHTING:**
${structuredAnalysis.shadingAndLighting.shadingStyle} with ${structuredAnalysis.shadingAndLighting.contrast} contrast. Lighting: ${structuredAnalysis.shadingAndLighting.lightingType}.

**STYLE GENRE:**
${structuredAnalysis.styleGenre}.

**MOOD:**
${structuredAnalysis.mood}.

**KEY DISTINCTIVE FEATURES:**
${structuredAnalysis.distinctiveFeatures.join(', ')}.`;

    return res.status(200).json({
      description: legacyDescription,
      structuredAnalysis: structuredAnalysis
    });

  } catch (error: any) {
    console.error("Error analyzing art style:", error);
    return res.status(500).json({ error: error.message || 'Failed to analyze art style' });
  }
}
