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
            text: `Analyze this character image in extreme detail. Extract EVERY visual characteristic that would be needed to recreate this exact character in different scenes and poses.

**YOUR TASK:** Create a comprehensive character description that captures EVERY detail.

**FORMAT YOUR RESPONSE AS A STRUCTURED LIST:**

**FACE:**
- Eye color: [specific shade]
- Eye shape: [describe]
- Eyebrow color and shape: [describe]
- Nose: [describe shape and size]
- Mouth: [describe shape, lip color]
- Face shape: [oval, round, square, etc.]
- Skin tone: [very specific shade description]
- Facial features: [any marks, freckles, dimples, etc.]

**HAIR:**
- Color: [exact shade, e.g., "golden blonde", "dark brown with auburn highlights"]
- Style: [describe cut and styling]
- Length: [specific length]
- Texture: [straight, wavy, curly, etc.]
- Bangs: [yes/no, style if yes]
- Accessories: [hair clips, bands, etc.]

**BODY:**
- Build: [slim, athletic, muscular, etc.]
- Height: [tall, average, short - relative impression]
- Posture: [describe typical stance]

**CLOTHING:**
- Top: [describe in detail - color, style, material]
- Bottom: [describe in detail]
- Shoes: [if visible]
- Colors: [list all clothing colors]
- Style: [modern, fantasy, historical, etc.]

**ACCESSORIES:**
- Jewelry: [earrings, necklaces, rings, etc.]
- Glasses: [style if present]
- Bags or items: [describe]
- Other: [any other accessories]

**DISTINCTIVE FEATURES:**
- Unique characteristics: [scars, tattoos, birthmarks]
- Expression: [typical facial expression]
- Mood: [overall character vibe]

**IMPORTANT:** Be EXTREMELY specific. Instead of "blonde hair", say "shoulder-length golden blonde hair with subtle honey highlights". Instead of "blue eyes", say "bright sapphire blue eyes with a slight almond shape".`
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
