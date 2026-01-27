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
      whisperModel: config?.whisperModel || 'gpt-4o-transcribe-diarize',
      gptModel: config?.gptModel || 'gpt-4o-transcribe-diarize',
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

  /**
   * Format seconds to timestamp [HH:MM:SS] or [MM:SS]
   */
  private formatTimestamp(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `[${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}]`;
    }
    return `[${minutes}:${secs.toString().padStart(2, '0')}]`;
  }

  async transcribe(
    input: TranscriptionInput,
    config: TranscriptionConfig
  ): Promise<TranscriptionResult> {
    if (!this.client) {
      throw new Error('OpenAI provider is not configured. Missing API key.');
    }

    const startTime = Date.now();

    // Step 1: Transcribe with Whisper or GPT-4o Transcribe
    const file = new File([input.buffer], input.fileName, { type: input.mimeType });

    const isGpt4oTranscribe = this.config.whisperModel.includes('gpt-4o-transcribe');
    const isDiarizeModel = this.config.whisperModel.includes('diarize');

    // Determine response format:
    // - gpt-4o-transcribe: only supports 'json' or 'text'
    // - gpt-4o-transcribe-diarize: supports 'json', 'text', or 'diarized_json'
    // - whisper-1: supports 'verbose_json', 'json', 'text', etc.
    let responseFormat: string;
    if (isDiarizeModel) {
      // For diarize model, use 'diarized_json' to get speaker information
      responseFormat = 'diarized_json';
    } else if (isGpt4oTranscribe) {
      // For standard gpt-4o-transcribe, use 'json' (only supports json or text)
      responseFormat = 'json';
    } else {
      // For whisper-1, use verbose_json for timestamps, or text
      responseFormat = config.enableTimestamps ? 'verbose_json' : 'text';
    }

    const transcriptionParams: any = {
      file,
      model: this.config.whisperModel,
      response_format: responseFormat,
    };

    // timestamp_granularities only supported by whisper-1, not gpt-4o-transcribe
    if (!isGpt4oTranscribe && config.enableTimestamps) {
      transcriptionParams.timestamp_granularities = ['segment'];
    }

    // chunking_strategy required for diarize models (recommended: 'auto')
    if (isDiarizeModel) {
      transcriptionParams.chunking_strategy = 'auto';
    }

    const transcription = await this.client.audio.transcriptions.create(transcriptionParams);

    // Extract text from response (can be string or object depending on format)
    let rawText: string;
    if (typeof transcription === 'string') {
      rawText = transcription;
    } else {
      const transcriptionObj = transcription as any;

      // Handle diarized_json format (gpt-4o-transcribe-diarize)
      if (isDiarizeModel && transcriptionObj.segments) {
        // Format with speaker labels and timestamps
        rawText = transcriptionObj.segments
          .map((segment: any) => {
            const timestamp = this.formatTimestamp(segment.start);
            const speaker = segment.speaker || 'Unknown';
            return `${timestamp} [${speaker}] ${segment.text}`;
          })
          .join('\n');
      }
      // Handle json format (gpt-4o-transcribe)
      else if (isGpt4oTranscribe && transcriptionObj.text) {
        rawText = transcriptionObj.text;
      }
      // Handle verbose_json format (whisper-1)
      else if (config.enableTimestamps && transcriptionObj.segments) {
        rawText = transcriptionObj.segments
          .map((segment: any) => {
            const timestamp = this.formatTimestamp(segment.start);
            return `${timestamp} ${segment.text}`;
          })
          .join('\n');
      } else {
        rawText = transcriptionObj.text || '';
      }
    }

    // Step 2: Translate and format with GPT (if target language differs or speaker ID needed)
    // Note: GPT-4o transcribe models can't be used for post-processing (they're not chat models)
    // Only use post-processing if we have a valid chat model (not a transcription model)
    const isValidChatModel = !this.config.gptModel.includes('transcribe') && !this.config.gptModel.includes('whisper');
    const needsPostProcessing =
      isValidChatModel &&
      (config.targetLanguage.toLowerCase() !== 'english' ||
        config.enableSpeakerIdentification ||
        config.enableTimestamps); // Always post-process if timestamps needed for better formatting

    let finalText: string;
    let modelUsed: string;

    if (needsPostProcessing) {
      const prompt = buildTranscriptionPrompt({
        targetLanguage: config.targetLanguage,
        enableSpeakerIdentification: config.enableSpeakerIdentification,
        enableTimestamps: config.enableTimestamps,
        durationSeconds: config.durationSeconds,
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
            content: `Here is the transcription to process:\n\n${rawText}`,
          },
        ],
      });

      finalText = completion.choices[0]?.message?.content || rawText;
      modelUsed = `${this.config.whisperModel} + ${this.config.gptModel}`;
    } else {
      finalText = rawText;
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
