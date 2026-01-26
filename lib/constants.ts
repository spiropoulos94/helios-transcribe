// Models to process for multi-model transcription
export const MODELS_TO_PROCESS = [
  // {
  //   providerType: 'elevenlabs' as const,
  //   modelName: 'scribe_v2',
  //   displayName: 'ElevenLabs Scribe v2',
  //   pricing: {
  //     model10min: '$0.10',
  //     model30min: '$0.30',
  //     model1hr: '$0.59',
  //     bestFor: 'Best Greek accuracy - Correct proper nouns',
  //   },
  // },
  // {
  //   providerType: 'google-gemini' as const,
  //   modelName: 'gemini-2.5-flash',
  //   displayName: 'Gemini 2.5 Flash',
  //   pricing: {
  //     model10min: '$0.02',
  //     model30min: '$0.06',
  //     model1hr: '$0.11',
  //     bestFor: 'High speed & lowest cost',
  //   },
  // },
  // {
  //   providerType: 'google-gemini' as const,
  //   modelName: 'gemini-2.5-pro',
  //   displayName: 'Gemini 2.5 Pro',
  //   pricing: {
  //     model10min: '$0.04',
  //     model30min: '$0.13',
  //     model1hr: '$0.26',
  //     bestFor: 'Best Value - Good quality',
  //   },
  // },
  {
    providerType: 'google-gemini' as const,
    modelName: 'gemini-3-pro-preview',
    displayName: 'Gemini 3 Pro Preview',
    pricing: {
      model10min: '$0.07',
      model30min: '$0.22',
      model1hr: '$0.44',
      bestFor: 'Latest model - Best Greek quality',
    },
  },
  // {
  //   providerType: 'openai' as const,
  //   modelName: 'whisper-1',
  //   gptModel: 'gpt-5' as const,
  //   displayName: 'OpenAI Whisper + GPT-5',
  //   pricing: {
  //     model10min: '$0.06',
  //     model30min: '$0.18',
  //     model1hr: '$0.36',
  //     bestFor: 'Highest accuracy with GPT-5',
  //   },
  // },
];
