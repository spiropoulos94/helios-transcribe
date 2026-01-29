// Models to process for multi-model transcription
export const MODELS_TO_PROCESS = [
  // TEMP: Testing keyterm extraction comparison
  // {
  //   providerType: 'google-gemini' as const,
  //   modelName: 'gemini-3-pro-preview',
  //   displayName: 'Gemini 3 Pro (WITH keyterms)',
  //   enableKeytermExtraction: true,
  //   pricing: {
  //     model10min: '$0.07',
  //     model30min: '$0.22',
  //     model1hr: '$0.44',
  //     bestFor: 'Latest model with keyterm extraction',
  //   },
  // },
  // {
  //   providerType: 'google-gemini' as const,
  //   modelName: 'gemini-3-pro-preview',
  //   displayName: 'Gemini 3 Pro (WITHOUT keyterms)',
  //   enableKeytermExtraction: false,
  //   pricing: {
  //     model10min: '$0.07',
  //     model30min: '$0.22',
  //     model1hr: '$0.44',
  //     bestFor: 'Latest model baseline',
  //   },
  // },
  {
    providerType: 'elevenlabs' as const,
    modelName: 'scribe_v2',
    displayName: 'ElevenLabs Scribe v2 (WITH keyterms)',
    enableKeytermExtraction: true,
    pricing: {
      model10min: '$0.10',
      model30min: '$0.30',
      model1hr: '$0.59',
      bestFor: 'Best Greek accuracy with keyterms',
    },
  },
  // {
  //   providerType: 'elevenlabs' as const,
  //   modelName: 'scribe_v2',
  //   displayName: 'ElevenLabs Scribe v2 (WITHOUT keyterms)',
  //   enableKeytermExtraction: false,
  //   pricing: {
  //     model10min: '$0.10',
  //     model30min: '$0.30',
  //     model1hr: '$0.59',
  //     bestFor: 'Best Greek accuracy baseline',
  //   },
  // },
];
