import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
const sceneGenerationModel = "gemini-2.5-flash";

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Use a new, unique variable name to avoid any possible conflict.
  const { novelText, characters: characterReferences } = req.body;

  if (!novelText) {
    return res.status(400).json({ error: 'Novel text is required' });
  }

  const characterNames = (characterReferences || []).map((c: any) => c.name).filter(Boolean);

  const prompt = `You are an expert illustration director for novels. Your task is to select the MOST VISUALLY IMPACTFUL and NARRATIVELY SIGNIFICANT moments from the following novel excerpt to be turned into illustrations.

**AVAILABLE CHARACTERS:**
${characterNames.length > 0 ? characterNames.join(', ') : 'None'}

**CRITICAL RULE: When filling the 
`name`
 field for a character in your JSON response, you MUST use a name from the 
`AVAILABLE CHARACTERS`
 list above. Do not translate or create new names.**

IMPORTANT GUIDELINES FOR SCENE SELECTION:

1. **Contextual Character Presence (NEW RULE)**
   - You must maintain a mental model of who is in the room.
   - If a character enters a location, they are assumed to be present in subsequent scenes in that same location until they are explicitly described as leaving.
   - When a character is contextually present but not the main actor, include them in the 
`sceneCharacters`
 array with a suitable background action (e.g., 
`action: 'listening quietly'`
, 
`expression: 'observing'`
).

2. **Intelligent Location Tracking (NEW RULE)**
   - The 
`environment.location`
 MUST be the physical space where the scene's primary action occurs.
   - Do NOT change the location just because another place is mentioned in dialogue or as a source of a sound. 
   - Example: If characters are in the 'living room' and hear a noise from the 'kitchen', the location for that scene remains 'living room'. A location change only happens when characters physically move to the new location.

3. **Prioritize Visual Action over Dialogue**
   - Choose moments where characters are DOING something, not just talking
   - Focus on facial expressions, body language, and physical interactions
   - Example: Instead of "They discussed the plan", choose "She slammed her fist on the table, eyes blazing"

4. **Capture Emotional Turning Points**
   - Select scenes where emotions shift dramatically
   - Moments of realization, shock, joy, or despair
   - The character's internal state should be visible in their actions/expressions

5. **Include Atmospheric Setting**
   - Choose scenes where the environment contributes to the mood
   - Lighting, weather, or location that enhances the story
   - Describe how the setting affects the characters

6. **Ensure Story Flow Coverage**
   - Distribute scenes across: introduction → development → climax → resolution
   - Each scene should advance understanding of the plot
   - Avoid clustering too many scenes in one part of the story

7. **Character Relationships & Interactions**
   - Show relationships through positioning, eye contact, distance
   - Capture moments of connection, conflict, or tension between characters
   - Physical proximity and body language reveal dynamics

8. **Include Important Dialogue Scenes (With Visual Context)**
   - Important conversations CAN and SHOULD be illustrated
   - Describe what characters are doing WHILE speaking
   - Include their expressions, gestures, body language, and setting
   - Example: "Butler formally reporting to lady at breakfast, morning light streaming through windows, she looks up with interest"

**STRUCTURED OUTPUT FORMAT:**

For each scene, provide a JSON object with the following structure:

- **summary**: One sentence describing the overall scene
- **sourceExcerpt**: The exact excerpt from the original novel text that this scene is based on (1-3 sentences from the source)
- **sceneCharacters**: Array of characters in the scene, each with: 
  - name: Character's name
  - action: What they are physically doing
  - expression: Their facial expression
  - posture: Body language and posture
  - position: Where they are in the scene
- **environment**:
  - location: Where the scene takes place. CRITICAL: This MUST be the specific noun from the source text (e.g., "diner", "forest", "castle"). DO NOT use synonyms or generic descriptions.
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
  - interactionParticipants: Array of character names involved
  - type: Type of interaction (confrontation/conversation/support/etc)
  - description: How they are interacting
  - physicalDistance: How close/far they are

**IMPORTANT: NUMBER OF SCENES**
- **Short text (1-3 paragraphs)**: Generate at least 4-5 scenes
- **Medium text (4-10 paragraphs)**: Generate 6-8 scenes
- **Long text (11+ paragraphs)**: Generate 8-12 scenes
- **NEVER generate fewer than 4 scenes**, even for very short texts
- Break down moments finely - every character introduction, emotional shift, or setting change should be its own scene
- It's better to have MORE detailed scenes than too few generic ones

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
                  sourceExcerpt: { type: Type.STRING },
                  sceneCharacters: { // Renamed to avoid conflict
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
                      properties: { item: { type: Type.STRING },
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
                        characterNamesInInteraction: {
                          type: Type.ARRAY,
                          items: { type: Type.STRING }
                        },
                        type: { type: Type.STRING },
                        description: { type: Type.STRING },
                        physicalDistance: { type: Type.STRING },
                      },
                      required: ["characterNamesInInteraction", "type", "description", "physicalDistance"]
                    }
                  }
                },
                required: ["summary", "sourceExcerpt", "sceneCharacters", "environment", "importantObjects", "mood"]
              }
            }
          },
          required: ["scenes"]
        },
      },
    });

    const jsonString = response.text;
    const result = JSON.parse(jsonString);

    // IMPORTANT: We must now rename `sceneCharacters` back to `characters` so the frontend can understand it.
    const processedScenes = result.scenes.map((scene: any) => {
        return {
            ...scene,
            characters: scene.sceneCharacters, // Rename sceneCharacters to characters
            sceneCharacters: undefined, // Remove the old key
        };
    });

    if (result && Array.isArray(result.scenes)) {
      return res.status(200).json({ scenes: processedScenes });
    }

    return res.status(500).json({ error: 'Invalid response from AI' });

  } catch (error: any) {
    console.error("Error generating scenes:", error);
    return res.status(500).json({ error: error.message || 'Failed to generate scenes' });
  }
}