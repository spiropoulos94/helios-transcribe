import { GoogleGenAI, FileState, createUserContent, createPartFromUri } from '@google/genai';
import {
  AITranscriptionProvider,
  TranscriptionInput,
  TranscriptionConfig,
  TranscriptionResult,
  ProviderCapabilities,
} from '../../types';
import { buildTranscriptionPrompt } from '../../prompts';
import { aiConfig } from '../../../config';

export interface GoogleProviderConfig {
  apiKey?: string;
  model?: string;
  pollingIntervalMs?: number;
  requestTimeoutMs?: number;
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
      apiKey: config?.apiKey || aiConfig.GEMINI_API_KEY || '',
      model: config?.model || process.env.GEMINI_MODEL || 'gemini-2.0-flash',
      pollingIntervalMs: config?.pollingIntervalMs || 2000,
      requestTimeoutMs: config?.requestTimeoutMs || 300000, // 5 minutes default
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

    try {
      return await this.performTranscription(input, config, startTime);
    } catch (error) {
      // Enhanced error handling with model-specific guidance
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Check for preview/experimental model issues
      if (this.config.model.includes('preview') || this.config.model.includes('exp')) {
        throw new Error(
          `Transcription failed with ${this.config.model}: ${errorMessage}. ` +
          `Preview models may have limited availability or API compatibility issues. ` +
          `Try using a stable model like 'gemini-2.0-flash' or 'gemini-2.5-flash' instead.`
        );
      }

      // Check for timeout issues
      if (errorMessage.includes('timed out')) {
        throw new Error(
          `Request timed out after ${this.config.requestTimeoutMs}ms: ${errorMessage}. ` +
          `This may indicate the file is too large, the model is overloaded, or network issues. ` +
          `Try a smaller file or a faster model like 'gemini-2.0-flash'.`
        );
      }

      // Check for network/fetch errors
      if (errorMessage.includes('fetch failed') || errorMessage.includes('network')) {
        throw new Error(
          `Network error occurred: ${errorMessage}. ` +
          `Please check your internet connection and verify the model '${this.config.model}' is available. ` +
          `Stable models include: gemini-2.0-flash, gemini-2.5-flash, gemini-2.5-pro.`
        );
      }

      // Re-throw with context
      throw new Error(`Transcription failed with ${this.config.model}: ${errorMessage}`);
    }
  }

  private async performTranscription(
    input: TranscriptionInput,
    config: TranscriptionConfig,
    startTime: number
  ): Promise<TranscriptionResult> {
    if (!this.client) {
      throw new Error('Client is not initialized');
    }

    const client = this.client;

    // Upload file to Google File API
    const uploadedFile = await client.files.upload({
      file: new Blob([input.buffer], { type: input.mimeType }),
      config: {
        mimeType: input.mimeType,
        displayName: input.fileName,
      },
    });

    // Wait for file to be processed
    let fileMetadata = await client.files.get({ name: uploadedFile.name! });
    while (fileMetadata.state === FileState.PROCESSING) {
      await this.delay(this.config.pollingIntervalMs);
      fileMetadata = await client.files.get({ name: uploadedFile.name! });
    }

    if (fileMetadata.state === FileState.FAILED) {
      throw new Error('File processing failed on Google servers');
    }

    // Build prompt and generate content
    const prompt = buildTranscriptionPrompt({
      targetLanguage: config.targetLanguage,
      enableSpeakerIdentification: config.enableSpeakerIdentification,
      enableTimestamps: config.enableTimestamps,
      durationSeconds: config.durationSeconds,
      customInstructions: config.customInstructions,
    });

    // Determine appropriate token limit based on model
    // Gemini 2.0 Flash: 8,192 tokens max
    // Gemini 2.5 Flash: 65,536 tokens max
    // Gemini 3.0 Pro: Use conservative 32,768 for preview models
    const maxOutputTokens = this.config.model.includes('gemini-3')
      ? 32768 // Conservative limit for preview models
      : this.config.model.includes('2.5')
        ? 65536
        : 8192;

    // Generate content with timeout protection
    const response = await this.generateContentWithTimeout(
      {
        model: this.config.model,
        contents: createUserContent([
          createPartFromUri(fileMetadata.uri!, fileMetadata.mimeType!),
          prompt,
        ]),
        config: {
          maxOutputTokens,
        },
      },
      this.config.requestTimeoutMs
    );

    // Clean up: delete the uploaded file
    await client.files.delete({ name: uploadedFile.name! }).catch(() => {
      // Ignore deletion errors
    });

    const text = response.text || '';
    const processingTimeMs = Date.now() - startTime;

    // Check for potential truncation
    const finishReason = response.candidates?.[0]?.finishReason;
    const wasTruncated = finishReason === 'MAX_TOKENS' || finishReason === 'RECITATION';

    // Log warning if truncated (visible in server logs)
    if (wasTruncated) {
      console.warn(
        `[Google Gemini] Response may be incomplete. Finish reason: ${finishReason}. ` +
        `Model: ${this.config.model}, Duration: ${config.durationSeconds}s, ` +
        `Output length: ${text.length} chars. Consider upgrading model or splitting audio.`
      );
    }

    return {
      text,
      provider: this.name,
      metadata: {
        wordCount: text.split(/\s+/).filter(Boolean).length,
        model: this.config.model,
        processingTimeMs,
        finishReason, // Include finish reason for debugging
        wasTruncated, // Flag to indicate potential incomplete transcription
      },
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Generate content with timeout protection
   * Wraps the API call with a timeout to prevent indefinite hanging
   */
  private async generateContentWithTimeout(
    params: {
      model: string;
      contents: ReturnType<typeof createUserContent>;
      config?: { maxOutputTokens?: number };
    },
    timeoutMs: number
  ) {
    if (!this.client) {
      throw new Error('Client is not initialized');
    }

    const client = this.client;

    return Promise.race([
      client.models.generateContent(params),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Request timed out after ${timeoutMs}ms. The model may be unavailable or the file may be too large.`)),
          timeoutMs
        )
      ),
    ]);
  }
}
