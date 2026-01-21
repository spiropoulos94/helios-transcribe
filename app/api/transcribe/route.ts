import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: 'API Key is missing. Please check your environment configuration.' },
      { status: 500 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Convert file to base64
    const arrayBuffer = await file.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString('base64');
    const mimeType = file.type;

    const ai = new GoogleGenAI({ apiKey });
    const modelId = 'gemini-2.0-flash';

    const prompt = `
      You are an expert transcriber and translator.
      Task: Transcribe the audio from this file directly into Greek (Ελληνικά).

      Guidelines:
      1. Provide a highly accurate transcription in Greek.
      2. If the audio is already in Greek, transcribe it verbatim.
      3. If the audio is in English or another language, translate it fluently into Greek as you transcribe.
      4. **Speaker Identification**: Identify when the speaker changes. Label them clearly using the format "Ομιλητής 1:", "Ομιλητής 2:", etc.
      5. **Formatting**: Start a new paragraph every time the speaker changes. Ensure the output is clean and readable.
      6. Do not include timestamps unless specifically asked.
      7. Do not add introductory text like "Here is the transcription". Just provide the Greek text.
    `;

    const response = await ai.models.generateContent({
      model: modelId,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data,
            },
          },
          {
            text: prompt,
          },
        ],
      },
    });

    const text = response.text || 'No transcription generated.';

    return NextResponse.json({
      text,
      metadata: {
        wordCount: text.split(/\s+/).length,
      },
    });
  } catch (error: unknown) {
    console.error('Gemini Transcription Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to process the media file.';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
