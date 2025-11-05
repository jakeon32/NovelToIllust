import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
const sceneGenerationModel = "gemini-2.5-flash";

// This is a completely rebuilt handler for generate-scenes.ts to eliminate the persistent SyntaxError.
// It removes the complex responseSchema and relies on a clear text prompt to instruct the AI.
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { novelText, characters } = req.body;

    if (!novelText) {
      return res.status(400).json({ error: 'Novel text is required' });
    }

    const characterNames = (characters || []).map((c: any) => c.name).filter(Boolean);

    // The prompt now describes the desired JSON structure directly.
    const prompt = `You are an expert illustration director for novels. Your task is to analyze the following novel excerpt and generate a JSON object containing a list of scenes.

    **AVAILABLE CHARACTERS:**
    ${characterNames.length > 0 ? characterNames.join(', ') : 'None'}

    **CRITICAL RULE: When filling the "name" field for a character in your JSON response, you MUST use a name from the "AVAILABLE CHARACTERS" list above. Do not translate or create new names.**

    IMPORTANT GUIDELINES FOR SCENE SELECTION:

    1. **Contextual Character Presence:** Maintain a mental model of who is in the room. If a character enters a location, assume they remain present until they explicitly leave. Include contextually present characters in the output.
    2. **Intelligent Location Tracking:** The location must be the physical space of the action. Do not change the location based on mere mentions or sounds from another place.
    3. **Prioritize Visuals:** Focus on scenes with action, expression, and interaction over simple dialogue.
    4. **Capture Emotion:** Select moments of dramatic emotional shifts.

    **REQUIRED OUTPUT FORMAT:**
    Your entire response MUST be a single, valid JSON object. It must contain one key: "scenes".
    The "scenes" key must be an array of JSON objects, where each object has the following structure:
    {
      "summary": "One sentence describing the overall scene",
      "sourceExcerpt": "The exact 1-3 sentences from the original novel text that this scene is based on",
      "characters": [
        {
          "name": "Character's name (from AVAILABLE CHARACTERS list)",
          "action": "What they are physically doing",
          "expression": "Their facial expression"
        }
      ],
      "environment": {
        "location": "Where the scene takes place (specific noun from the text)",
        "timeOfDay": "e.g., morning, afternoon, night",
        "lighting": "Description of the lighting",
        "atmosphere": "The overall mood of the environment"
      }
    }

    **NUMBER OF SCENES:**
    - Short text (1-3 paragraphs): Generate 4-5 scenes.
    - Medium text (4-10 paragraphs): Generate 6-8 scenes.
    - Long text (11+ paragraphs): Generate 8-12 scenes.
    - NEVER generate fewer than 4 scenes.

    Novel Text:
    ${novelText}
    `;

    const response = await ai.models.generateContent({
      model: sceneGenerationModel,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const jsonString = response.text;
    const result = JSON.parse(jsonString);

    if (result && Array.isArray(result.scenes)) {
      // The frontend expects a `characters` property on the scene object.
      // The AI was instructed to generate `characters` directly, so no renaming is needed.
      return res.status(200).json({ scenes: result.scenes });
    }

    console.error("Invalid JSON response from AI:", jsonString);
    return res.status(500).json({ error: 'Invalid response structure from AI' });

  } catch (error: any) {
    console.error("Error generating scenes:", error);
    return res.status(500).json({ error: error.message || 'Failed to generate scenes' });
  }
}
