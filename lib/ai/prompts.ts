export interface PromptConfig {
  targetLanguage: string;
  enableSpeakerIdentification: boolean;
  enableTimestamps?: boolean;
  durationSeconds?: number;
  customInstructions?: string;
}

/**
 * Build a transcription prompt based on configuration
 * Simplified approach matching working sample for better structured output
 */
export function buildTranscriptionPrompt(config: PromptConfig): string {
  const { targetLanguage, enableSpeakerIdentification, enableTimestamps, customInstructions } = config;

  let prompt = `You are an expert transcriber fluent in ${targetLanguage}.

Task:
1. Transcribe the provided audio into ${targetLanguage}.`;

  if (enableSpeakerIdentification) {
    prompt += `
2. Identify different speakers (Speaker A, Speaker B, etc.).`;
  }

  prompt += `
3. Create natural segments (phrases or sentences, not individual words).`;

  if (enableTimestamps) {
    prompt += `
4. Provide accurate start and end timestamps in seconds for each segment.`;
  }

  if (customInstructions) {
    prompt += `

Additional instructions:
${customInstructions}`;
  }

  prompt += `

Output must be valid JSON matching the schema.`;

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
