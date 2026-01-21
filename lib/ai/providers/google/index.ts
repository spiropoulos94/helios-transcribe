import { GoogleGenAI, FileState } from '@google/genai';
import {
  AITranscriptionProvider,
  TranscriptionInput,
  TranscriptionConfig,
  TranscriptionResult,
  ProviderCapabilities,
} from '../../types';
import { buildTranscriptionPrompt } from '../../prompts';

export interface GoogleProviderConfig {
  apiKey?: string;
  model?: string;
  pollingIntervalMs?: number;
}

export class GoogleGeminiProvider implements AITranscriptionProvider {
  readonly name = 'google-gemini';

  readonly capabilities: ProviderCapabilities = {
    supportedMimeTypes: [
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      'audio/webm',
      'audio/ogg',
      'audio/flac',
      'audio/aac',
      'audio/m4a',
      'video/mp4',
      'video/webm',
      'video/quicktime',
      'video/x-msvideo',
      'video/mpeg',
    ],
    maxFileSizeBytes: 2 * 1024 * 1024 * 1024, // 2GB
    supportsSpeakerIdentification: true,
    supportsTranslation: true,
  };

  private client: GoogleGenAI | null = null;
  private config: Required<GoogleProviderConfig>;

  constructor(config?: GoogleProviderConfig) {
    this.config = {
      apiKey: config?.apiKey || process.env.GEMINI_API_KEY || '',
      model: config?.model || 'gemini-2.0-flash',
      pollingIntervalMs: config?.pollingIntervalMs || 2000,
    };

    if (this.config.apiKey) {
      this.client = new GoogleGenAI({ apiKey: this.config.apiKey });
    }
  }

  isConfigured(): boolean {
    return !!this.config.apiKey;
  }

  validateInput(input: TranscriptionInput): { valid: boolean; error?: string } {
    if (!this.capabilities.supportedMimeTypes.includes(input.mimeType)) {
      return {
        valid: false,
        error: `Unsupported file type: ${input.mimeType}. Supported: ${this.capabilities.supportedMimeTypes.join(', ')}`,
      };
    }

    if (input.buffer.byteLength > this.capabilities.maxFileSizeBytes) {
      return {
        valid: false,
        error: `File too large. Maximum size: ${this.capabilities.maxFileSizeBytes / (1024 * 1024 * 1024)}GB`,
      };
    }

    return { valid: true };
  }

  async transcribe(
    input: TranscriptionInput,
    config: TranscriptionConfig
  ): Promise<TranscriptionResult> {
    if (!this.client) {
      throw new Error('Google Gemini provider is not configured. Missing API key.');
    }

    const startTime = Date.now();

    // Upload file to Google File API
    const uploadedFile = await this.client.files.upload({
      file: new Blob([input.buffer], { type: input.mimeType }),
      config: {
        mimeType: input.mimeType,
        displayName: input.fileName,
      },
    });

    // Wait for file to be processed
    let fileMetadata = await this.client.files.get({ name: uploadedFile.name! });
    while (fileMetadata.state === FileState.PROCESSING) {
      await this.delay(this.config.pollingIntervalMs);
      fileMetadata = await this.client.files.get({ name: uploadedFile.name! });
    }

    if (fileMetadata.state === FileState.FAILED) {
      throw new Error('File processing failed on Google servers');
    }

    // Build prompt and generate content
    const prompt = buildTranscriptionPrompt({
      targetLanguage: config.targetLanguage,
      enableSpeakerIdentification: config.enableSpeakerIdentification,
      customInstructions: config.customInstructions,
    });

    const response = await this.client.models.generateContent({
      model: this.config.model,
      contents: {
        parts: [
          {
            fileData: {
              fileUri: fileMetadata.uri!,
              mimeType: fileMetadata.mimeType!,
            },
          },
          { text: prompt },
        ],
      },
    });

    // Clean up: delete the uploaded file
    await this.client.files.delete({ name: uploadedFile.name! }).catch(() => {
      // Ignore deletion errors
    });

    const text = response.text || '';
    const processingTimeMs = Date.now() - startTime;

    return {
      text,
      provider: this.name,
      metadata: {
        wordCount: text.split(/\s+/).filter(Boolean).length,
        model: this.config.model,
        processingTimeMs,
      },
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
