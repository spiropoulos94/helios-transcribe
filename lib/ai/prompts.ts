export interface PromptConfig {
  targetLanguage: string;
  enableSpeakerIdentification: boolean;
  enableTimestamps?: boolean;
  durationSeconds?: number;
  customInstructions?: string;
}

/**
 * Format duration in seconds to [HH:MM:SS] or [MM:SS] format
 */
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `[${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}]`;
  }
  return `[${minutes}:${secs.toString().padStart(2, '0')}]`;
}

/**
 * Build a transcription prompt based on configuration
 */
export function buildTranscriptionPrompt(config: PromptConfig): string {
  const { targetLanguage, enableSpeakerIdentification, enableTimestamps, durationSeconds, customInstructions } = config;

  let prompt = `
You are an expert transcriber and translator.
Task: Transcribe the audio from this file directly into ${targetLanguage}.

Guidelines:
1. Provide a highly accurate transcription in ${targetLanguage}.
2. If the audio is already in ${targetLanguage}, transcribe it verbatim.
3. If the audio is in another language, translate it fluently into ${targetLanguage} as you transcribe.
`;

  if (enableTimestamps) {
    const maxTime = durationSeconds ? formatDuration(durationSeconds) : 'the video duration';
    prompt += `4. **Timestamps**: Include timestamps in the format [MM:SS] or [HH:MM:SS] at the beginning of each paragraph or speaker change.
   - Format: [00:00] for start, [01:23] for 1 minute 23 seconds, [1:05:30] for 1 hour 5 minutes 30 seconds
   - Place timestamp at the start of each new paragraph or when the topic changes significantly
   - IMPORTANT: Timestamps must accurately reflect the actual position in the audio/video timeline
   - The maximum timestamp should not exceed ${maxTime} (total duration)
   - Listen carefully to the audio timeline and ensure timestamps match the actual time when content occurs
`;
  }

  if (enableSpeakerIdentification) {
    const nextNum = enableTimestamps ? 5 : 4;
    prompt += `${nextNum}. **Speaker Identification**: Identify when the speaker changes. Label them clearly using the format "Speaker 1:", "Speaker 2:", etc.
${nextNum + 1}. **Formatting**: Start a new paragraph every time the speaker changes. Ensure the output is clean and readable.
`;
  }

  const finalNum = (enableTimestamps ? 1 : 0) + (enableSpeakerIdentification ? 2 : 0) + 4;
  prompt += `${finalNum}. Do not add introductory text like "Here is the transcription". Just provide the text.
`;

  if (customInstructions) {
    prompt += `\nAdditional instructions: ${customInstructions}`;
  }

  return prompt.trim();
}

/**
 * Greek-specific prompt (preserves existing behavior)
 */
export function buildGreekTranscriptionPrompt(enableSpeakerIdentification = true): string {
  return buildTranscriptionPrompt({
    targetLanguage: 'Greek (Ελληνικά)',
    enableSpeakerIdentification,
  });
}
