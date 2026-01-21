export interface PromptConfig {
  targetLanguage: string;
  enableSpeakerIdentification: boolean;
  customInstructions?: string;
}

/**
 * Build a transcription prompt based on configuration
 */
export function buildTranscriptionPrompt(config: PromptConfig): string {
  const { targetLanguage, enableSpeakerIdentification, customInstructions } = config;

  let prompt = `
You are an expert transcriber and translator.
Task: Transcribe the audio from this file directly into ${targetLanguage}.

Guidelines:
1. Provide a highly accurate transcription in ${targetLanguage}.
2. If the audio is already in ${targetLanguage}, transcribe it verbatim.
3. If the audio is in another language, translate it fluently into ${targetLanguage} as you transcribe.
`;

  if (enableSpeakerIdentification) {
    prompt += `4. **Speaker Identification**: Identify when the speaker changes. Label them clearly using the format "Speaker 1:", "Speaker 2:", etc.
5. **Formatting**: Start a new paragraph every time the speaker changes. Ensure the output is clean and readable.
`;
  }

  prompt += `6. Do not include timestamps unless specifically asked.
7. Do not add introductory text like "Here is the transcription". Just provide the text.
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
