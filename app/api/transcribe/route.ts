import { NextRequest, NextResponse } from 'next/server';
import { getDefaultProvider, TranscriptionInput, TranscriptionConfig } from '@/lib/ai';

// Default configuration for Greek transcription
const DEFAULT_CONFIG: TranscriptionConfig = {
  targetLanguage: 'Greek (Ελληνικά)',
  enableSpeakerIdentification: true,
};

export async function POST(request: NextRequest) {
  try {
    // Get the configured provider
    const provider = getDefaultProvider();

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Prepare input
    const input: TranscriptionInput = {
      buffer: await file.arrayBuffer(),
      mimeType: file.type,
      fileName: file.name,
    };

    // Validate input
    const validation = provider.validateInput(input);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Get optional config overrides from form data
    const config: TranscriptionConfig = {
      ...DEFAULT_CONFIG,
      targetLanguage:
        formData.get('targetLanguage')?.toString() || DEFAULT_CONFIG.targetLanguage,
      enableSpeakerIdentification: formData.get('enableSpeakerIdentification') !== 'false',
    };

    // Perform transcription
    const result = await provider.transcribe(input, config);

    return NextResponse.json({
      text: result.text,
      metadata: result.metadata,
    });
  } catch (error: unknown) {
    console.error('Transcription Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to process the media file.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
