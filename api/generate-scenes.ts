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

**STRUCTURED OUTPUT FORMAT:**

For each scene, provide a JSON object with the following structure:

- **summary**: One sentence describing the overall scene
- **characters**: Array of characters in the scene, each with:
  - name: Character's name
  - action: What they are physically doing
  - expression: Their facial expression
  - posture: Body language and posture
  - position: Where they are in the scene
- **environment**:
  - location: Where the scene takes place
  - timeOfDay: Time (morning/afternoon/evening/night)
  - lighting: Description of lighting
  - weather: Weather conditions (if relevant/outdoor)
  - atmosphere: Overall mood of the environment
- **importantObjects**: Array of crucial objects/props, each with:
  - item: Name of the object
  - description: Visual description
  - importance: Why it matters to the scene
- **mood**:
  - emotionalTone: Overall emotional feeling
  - tensionLevel: low/medium/high
  - keyFeeling: The primary emotion being conveyed
- **interactions** (optional, if multiple characters):
  - characters: Array of character names involved
  - type: Type of interaction (confrontation/conversation/support/etc)
  - description: How they are interacting
  - physicalDistance: How close/far they are

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
              items: {
                type: Type.OBJECT,
                properties: {
                  summary: { type: Type.STRING },
                  characters: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        name: { type: Type.STRING },
                        action: { type: Type.STRING },
                        expression: { type: Type.STRING },
                        posture: { type: Type.STRING },
                        position: { type: Type.STRING },
                      },
                      required: ["name", "action", "expression", "posture", "position"]
                    }
                  },
                  environment: {
                    type: Type.OBJECT,
                    properties: {
                      location: { type: Type.STRING },
                      timeOfDay: { type: Type.STRING },
                      lighting: { type: Type.STRING },
                      weather: { type: Type.STRING },
                      atmosphere: { type: Type.STRING },
                    },
                    required: ["location", "timeOfDay", "lighting", "atmosphere"]
                  },
                  importantObjects: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        item: { type: Type.STRING },
                        description: { type: Type.STRING },
                        importance: { type: Type.STRING },
                      },
                      required: ["item", "description", "importance"]
                    }
                  },
                  mood: {
                    type: Type.OBJECT,
                    properties: {
                      emotionalTone: { type: Type.STRING },
                      tensionLevel: { type: Type.STRING },
                      keyFeeling: { type: Type.STRING },
                    },
                    required: ["emotionalTone", "tensionLevel", "keyFeeling"]
                  },
                  interactions: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        characters: {
                          type: Type.ARRAY,
                          items: { type: Type.STRING }
                        },
                        type: { type: Type.STRING },
                        description: { type: Type.STRING },
                        physicalDistance: { type: Type.STRING },
                      },
                      required: ["characters", "type", "description", "physicalDistance"]
                    }
                  }
                },
                required: ["summary", "characters", "environment", "importantObjects", "mood"]
              }
            }
          },
          required: ["scenes"]
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
