import OpenAI from 'openai';
import {
  AITranscriptionProvider,
  TranscriptionInput,
  TranscriptionConfig,
  TranscriptionResult,
  ProviderCapabilities,
} from '../../types';
import { buildTranscriptionPrompt } from '../../prompts';
import { aiConfig } from '../../../config';

export interface OpenAIProviderConfig {
  apiKey?: string;
  whisperModel?: string;
  gptModel?: string;
}

export class OpenAIProvider implements AITranscriptionProvider {
  readonly name = 'openai';

  readonly capabilities: ProviderCapabilities = {
    supportedMimeTypes: [
      'audio/mpeg',
      'audio/mp3',
      'audio/mp4',
      'audio/wav',
      'audio/webm',
      'audio/m4a',
      'audio/flac',
      'audio/ogg',
    ],
    maxFileSizeBytes: 25 * 1024 * 1024, // 25MB for Whisper
    supportsSpeakerIdentification: false, // Whisper doesn't natively support this
    supportsTranslation: true, // Via GPT post-processing
  };

  private client: OpenAI | null = null;
  private config: Required<OpenAIProviderConfig>;

  constructor(config?: OpenAIProviderConfig) {
    this.config = {
      apiKey: config?.apiKey || aiConfig.OPENAI_API_KEY || '',
      whisperModel: config?.whisperModel || 'whisper-1',
      gptModel: config?.gptModel || 'gpt-4o',
    };

    if (this.config.apiKey) {
      this.client = new OpenAI({ apiKey: this.config.apiKey });
    }
  }

  isConfigured(): boolean {
    return !!this.config.apiKey;
  }

  validateInput(input: TranscriptionInput): { valid: boolean; error?: string } {
    // OpenAI Whisper only supports audio, not video
    const isAudio = this.capabilities.supportedMimeTypes.some((type) =>
      input.mimeType.startsWith(type.split('/')[0])
    );

    if (!isAudio) {
      return {
        valid: false,
        error: `OpenAI Whisper only supports audio files. For video, please extract the audio first or use the Google Gemini provider.`,
      };
    }

    if (input.buffer.byteLength > this.capabilities.maxFileSizeBytes) {
      return {
        valid: false,
        error: `File too large for OpenAI. Maximum size: ${this.capabilities.maxFileSizeBytes / (1024 * 1024)}MB`,
      };
    }

    return { valid: true };
  }

  async transcribe(
    input: TranscriptionInput,
    config: TranscriptionConfig
  ): Promise<TranscriptionResult> {
    if (!this.client) {
      throw new Error('OpenAI provider is not configured. Missing API key.');
    }

    const startTime = Date.now();

    // Step 1: Transcribe with Whisper
    const file = new File([input.buffer], input.fileName, { type: input.mimeType });

    const transcription = await this.client.audio.transcriptions.create({
      file,
      model: this.config.whisperModel,
      response_format: 'text',
    });

    // Step 2: Translate and format with GPT (if target language differs or speaker ID needed)
    const needsPostProcessing =
      config.targetLanguage.toLowerCase() !== 'english' ||
      config.enableSpeakerIdentification;

    let finalText: string;
    let modelUsed: string;

    if (needsPostProcessing) {
      const prompt = buildTranscriptionPrompt({
        targetLanguage: config.targetLanguage,
        enableSpeakerIdentification: config.enableSpeakerIdentification,
        customInstructions: config.customInstructions,
      });

      const completion = await this.client.chat.completions.create({
        model: this.config.gptModel,
        messages: [
          {
            role: 'system',
            content: prompt,
          },
          {
            role: 'user',
            content: `Here is the transcription to process:\n\n${transcription}`,
          },
        ],
      });

      finalText = completion.choices[0]?.message?.content || transcription;
      modelUsed = `${this.config.whisperModel} + ${this.config.gptModel}`;
    } else {
      finalText = transcription;
      modelUsed = this.config.whisperModel;
    }

    const processingTimeMs = Date.now() - startTime;

    return {
      text: finalText,
      provider: this.name,
      metadata: {
        wordCount: finalText.split(/\s+/).filter(Boolean).length,
        model: modelUsed,
        processingTimeMs,
      },
    };
  }
}
