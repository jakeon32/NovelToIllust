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

  const prompt = `You are an expert illustration director for novels. Your task is to select the MOST VISUALLY IMPACTFUL and NARRATIVELY SIGNIFICANT moments from the following novel excerpt to be turned into illustrations.

IMPORTANT GUIDELINES FOR SCENE SELECTION:

1. **Prioritize Visual Action over Dialogue**
   - Choose moments where characters are DOING something, not just talking
   - Focus on facial expressions, body language, and physical interactions
   - Example: Instead of "They discussed the plan", choose "She slammed her fist on the table, eyes blazing"

2. **Capture Emotional Turning Points**
   - Select scenes where emotions shift dramatically
   - Moments of realization, shock, joy, or despair
   - The character's internal state should be visible in their actions/expressions

3. **Include Atmospheric Setting**
   - Choose scenes where the environment contributes to the mood
   - Lighting, weather, or location that enhances the story
   - Describe how the setting affects the characters

4. **Ensure Story Flow Coverage**
   - Distribute scenes across: introduction → development → climax → resolution
   - Each scene should advance understanding of the plot
   - Avoid clustering too many scenes in one part of the story

5. **Character Relationships & Interactions**
   - Show relationships through positioning, eye contact, distance
   - Capture moments of connection, conflict, or tension between characters
   - Physical proximity and body language reveal dynamics

6. **Avoid Pure Dialogue Scenes**
   - Don't select scenes that are only conversation
   - If dialogue is crucial, describe what characters are doing WHILE speaking
   - Include their expressions, gestures, and the surrounding context

For each selected scene, provide:
- A vivid, detailed description focusing on visual elements
- Character positions, expressions, and actions
- Setting details (lighting, atmosphere, background)
- The emotional tone and mood
- Any important objects or environmental details

Based on the novel's length, select 3-8 scenes that work together as a cohesive visual narrative.

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
