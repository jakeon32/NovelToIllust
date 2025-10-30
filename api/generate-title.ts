import { GoogleGenAI } from "@google/genai";

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

  const prompt = `Based on the following novel text, create a short, descriptive title (4-5 words maximum) for this project.

Novel Text:
\`\`\`
${novelText.substring(0, 1000)}
\`\`\`

Title:`;

  try {
    const response = await ai.models.generateContent({
      model: sceneGenerationModel,
      contents: prompt,
    });

    const title = response.text.trim().replace(/"/g, '');
    return res.status(200).json({ title });

  } catch (error: any) {
    console.error("Error generating title:", error);
    return res.status(200).json({ title: "Untitled Story" }); // Fallback
  }
}
