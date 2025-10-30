import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
const sceneGenerationModel = "gemini-2.5-flash";

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { novelText } = req.body;

  if (!novelText) {
    return res.status(400).json({ error: 'Novel text is required' });
  }

  const prompt = `You are a scriptwriter's assistant. Your task is to read the following novel excerpt and divide it into a series of distinct, visually rich scenes suitable for illustration. Based on the length of the text, decide on a reasonable number of scenes, typically between 3 and 8. For each scene, write a concise but descriptive paragraph that captures the key action, characters, setting, and mood. This description will be used as a prompt for an AI image generator.

Novel Text:
\`\`\`
${novelText}
\`\`\`
`;

  try {
    const response = await ai.models.generateContent({
      model: sceneGenerationModel,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            scenes: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          }
        },
      },
    });

    const jsonString = response.text;
    const result = JSON.parse(jsonString);

    if (result && Array.isArray(result.scenes)) {
      return res.status(200).json({ scenes: result.scenes });
    }

    return res.status(500).json({ error: 'Invalid response from AI' });

  } catch (error: any) {
    console.error("Error generating scenes:", error);
    return res.status(500).json({ error: error.message || 'Failed to generate scenes' });
  }
}
