export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // This is a test to see if the file is being updated.
  // It returns a simple success message with a hardcoded scene.
  try {
    const scenes = [
      {
        summary: "This is a test scene.",
        sourceExcerpt: "The server was not updating, so we are testing with a hardcoded response.",
        characters: [],
        environment: { location: 'Test Room', timeOfDay: 'N/A', lighting: 'N/A', atmosphere: 'Test atmosphere' },
        importantObjects: [],
        mood: { emotionalTone: 'testing', tensionLevel: 'low', keyFeeling: 'curiosity' },
      }
    ];
    return res.status(200).json({ scenes });

  } catch (error: any) {
    console.error("Error in test handler:", error);
    return res.status(500).json({ error: error.message || 'Failed to generate scenes' });
  }
}
