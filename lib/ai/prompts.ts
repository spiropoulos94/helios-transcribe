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

  // Detect if this is a very long file (2+ hours)
  const isVeryLongFile = durationSeconds && durationSeconds >= 7200; // 2+ hours

  let prompt = `
You are an expert transcriber and translator.
Task: Transcribe the COMPLETE audio from this file directly into ${targetLanguage}.

Guidelines:
1. Provide a highly accurate transcription in ${targetLanguage}.
2. If the audio is already in ${targetLanguage}, transcribe it verbatim.
3. If the audio is in another language, translate it fluently into ${targetLanguage} as you transcribe.
${isVeryLongFile ? `
**CRITICAL**: This is a long audio file (${Math.floor(durationSeconds! / 3600)} hours). You MUST transcribe the ENTIRE content from start to finish.
- Do NOT stop early or summarize
- Transcribe ALL spoken content completely
- Continue until you reach the end of the audio` : ''}
`;

  if (enableTimestamps) {
    const maxTime = durationSeconds ? formatDuration(durationSeconds) : 'the video duration';
    const isLongVideo = durationSeconds && durationSeconds >= 3600; // 1+ hours

    prompt += `4. **Timestamps**: Include timestamps at the beginning of each paragraph or speaker change.
   - **CRITICAL FORMAT REQUIREMENTS:**
     ${isLongVideo
       ? '* This is a long video (1+ hours). You MUST use [HH:MM:SS] format for ALL timestamps'
       : '* Use [MM:SS] format for videos under 1 hour, [HH:MM:SS] for longer videos'}
     * NEVER use total minutes (e.g., NEVER write [67:41] - this is WRONG)
     * ALWAYS convert to hours when minutes >= 60 (e.g., [1:07:41] is CORRECT for 1 hour 7 minutes)
   - Examples:
     * [00:00] = start
     * [01:23] = 1 minute 23 seconds
     * [1:05:30] = 1 hour 5 minutes 30 seconds
     * [8:45:12] = 8 hours 45 minutes 12 seconds
   - Place timestamp at the start of each new paragraph or topic change
   - Timestamps must accurately reflect the actual position in the audio/video timeline
   - The maximum timestamp should not exceed ${maxTime} (total duration)
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
