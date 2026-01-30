how to make the gemini return json with speaker segments and timestamps. is this supported?

Yes, this is fully supported. Gemini (1.5 Pro and 3 Pro) are natively multimodal, meaning they "hear" the audio and can generate structured data from it in a single pass.

To ensure it works, you must combine JSON Schema enforcement with a Multimodal Prompt.

1. The Transcription Schema
The most reliable way is to define a responseSchema in your code. This forces the model to stick to your keys and prevents it from adding conversational text.

Key	Type	Description
speaker	String	Use "Speaker A", "Speaker B", or names if identified.
start_timestamp	String	Use MM:SS or HH:MM:SS format.
text	String	The actual transcribed content of that segment.
2. Recommended TypeScript Implementation
Using the @google/generative-ai SDK, you can pass this schema directly into the generationConfig.

TypeScript
const transcriptionSchema = {
  type: "ARRAY",
  items: {
    type: "OBJECT",
    properties: {
      speaker: { type: "STRING" },
      start_timestamp: { type: "STRING" },
      end_timestamp: { type: "STRING" },
      text: { type: "STRING" }
    },
    required: ["speaker", "start_timestamp", "text"]
  }
};

const model = genAI.getGenerativeModel({
  model: "gemini-1.5-pro", // or "gemini-3-pro-preview"
  generationConfig: {
    responseMimeType: "application/json",
    responseSchema: transcriptionSchema,
  },
});
3. Strategic Advice for High Accuracy
What Gemini handles well:
Native Diarization: It is excellent at distinguishing voices even in noisy rooms.

Contextual Names: If one person says, "Hey Sarah, what do you think?", Gemini can often automatically switch the label from "Speaker B" to "Sarah."

The "Timestamp" Warning:
While Gemini supports timestamps, it is a generative model, not a signal-processing tool. It estimates time based on audio "tokens."

For 95% of users: This is fine (accurate within 1–2 seconds).

For 5% (Video Editors): If you need frame-accurate timestamps for subtitles, it is better to use Google Cloud Chirp 2 to get the "raw" timestamps first, then pass those into Gemini to clean up the formatting and speaker labels.

4. Final Tips for Success
Set Temperature to 0: This makes the transcription literal rather than "creative."

Explicit Instruction: Even with a schema, add this to your prompt: "Transcribe the audio exactly. Do not summarize. Include every filler word like 'um' and 'ah' if present."

Speaker Count: If you know how many people are in the room, tell the model: "There are exactly 3 speakers." This prevents it from hallucinating a 4th speaker when someone coughs or a door slams.

