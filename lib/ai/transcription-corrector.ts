import { GoogleGenAI, Type, createUserContent, createPartFromUri, FileState } from '@google/genai';
import type { StructuredTranscription, TranscriptionInput } from './types';

/**
 * Options for transcription correction
 */
export interface CorrectionOptions {
  /** Target language for correction (default: 'el' for Greek) */
  languageCode?: string;
  /** Whether to preserve timestamps (default: true) */
  preserveTimestamps?: boolean;
  /** Whether to preserve speaker labels (default: true) */
  preserveSpeakers?: boolean;
  /** Context from previous chunk (for better corrections at boundaries) */
  previousContext?: string;
  /** Context from next chunk (for better corrections at boundaries) */
  nextContext?: string;
  /** Audio input for audio-aware correction (optional) */
  audioInput?: TranscriptionInput;
  /** Enable audio-aware correction (default: false due to cost) */
  enableAudioVerification?: boolean;
}

/**
 * Result from transcription correction
 */
export interface CorrectionResult {
  /** Corrected text */
  correctedText: string;
  /** Corrected structured data (if input had structured data) */
  correctedStructuredData?: StructuredTranscription;
  /** Number of corrections made */
  correctionCount?: number;
  /** Processing time in milliseconds */
  processingTimeMs: number;
}

/**
 * Post-processes transcriptions to fix context-aware errors
 * Uses Gemini Flash to correct:
 * - Greek proper nouns (places, names, organizations)
 * - Technical terms and acronyms
 * - Diacritics and polytonic vs monotonic Greek
 * - Context-based spelling errors
 */
export class TranscriptionCorrector {
  private readonly apiKey: string;
  private readonly genAI: GoogleGenAI;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.GEMINI_API_KEY || '';

    if (!this.apiKey) {
      throw new Error('Google Gemini API key not configured');
    }

    this.genAI = new GoogleGenAI({ apiKey: this.apiKey });
  }

  /**
   * Correct a transcription text
   */
  async correctTranscription(
    text: string,
    options: CorrectionOptions = {}
  ): Promise<CorrectionResult> {
    const startTime = Date.now();

    const {
      languageCode = 'el',
      preserveTimestamps = true,
      preserveSpeakers = true,
      previousContext,
      nextContext,
      audioInput,
      enableAudioVerification = false,
    } = options;

    try {
      // If audio verification is enabled and audio input is provided, use audio-aware correction
      if (enableAudioVerification && audioInput) {
        console.log('[TranscriptionCorrector] Starting AUDIO-AWARE correction with Gemini Flash...');
        return await this.correctTranscriptionWithAudio(
          text,
          audioInput,
          languageCode,
          preserveTimestamps,
          preserveSpeakers,
          previousContext,
          nextContext
        );
      }

      console.log('[TranscriptionCorrector] Starting text-only correction with Gemini Flash...');

      // Build prompt for correction
      const prompt = this.buildCorrectionPrompt(
        text,
        languageCode,
        preserveTimestamps,
        preserveSpeakers,
        previousContext,
        nextContext
      );

      // Define schema for structured output
      const schema = {
        type: Type.OBJECT,
        properties: {
          corrected_text: {
            type: Type.STRING,
            description: 'The corrected transcription text with all errors fixed',
          },
          correction_count: {
            type: Type.NUMBER,
            description: 'Number of corrections made',
          },
        },
        required: ['corrected_text', 'correction_count'],
      };

      // Use Gemini 2.5 Flash for cheap, fast correction
      const response = await this.genAI.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: createUserContent([prompt]),
        config: {
          responseMimeType: 'application/json',
          responseSchema: schema,
          maxOutputTokens: 32768, // Increased from 8192 to handle larger corrections
          temperature: 0, // Deterministic output for consistent corrections
        },
      });

      const responseText = response.text || '';

      // Parse JSON response
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('[TranscriptionCorrector] Failed to parse JSON response:', parseError);
        console.error('[TranscriptionCorrector] Response length:', responseText.length);
        console.error('[TranscriptionCorrector] Response start:', responseText.substring(0, 500));
        console.error('[TranscriptionCorrector] Response end:', responseText.substring(Math.max(0, responseText.length - 500)));

        // Check if response was truncated
        const isTruncated = !responseText.trim().endsWith('}');
        if (isTruncated) {
          console.error('[TranscriptionCorrector] Response appears truncated (likely hit maxOutputTokens limit)');
        }

        throw new Error(`Invalid JSON response from Gemini: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
      }

      const correctedText = data.corrected_text || text;
      const correctionCount = data.correction_count || 0;

      const processingTimeMs = Date.now() - startTime;
      console.log(
        `[TranscriptionCorrector] Made ${correctionCount} corrections in ${processingTimeMs}ms`
      );

      return {
        correctedText,
        correctionCount,
        processingTimeMs,
      };
    } catch (error) {
      console.error('[TranscriptionCorrector] Correction failed:', error);
      // Don't throw - return original text so transcription can continue
      console.warn('[TranscriptionCorrector] Continuing with uncorrected text');
      return {
        correctedText: text,
        processingTimeMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Correct structured transcription data
   */
  async correctStructuredTranscription(
    structuredData: StructuredTranscription,
    options: CorrectionOptions = {}
  ): Promise<CorrectionResult> {
    const startTime = Date.now();

    const {
      languageCode = 'el',
      previousContext,
      nextContext,
    } = options;

    try {
      console.log('[TranscriptionCorrector] Starting structured correction with Gemini Flash...');

      // Build prompt for structured correction
      const prompt = this.buildStructuredCorrectionPrompt(
        structuredData,
        languageCode,
        previousContext,
        nextContext
      );

      // Define schema for structured output
      const schema = {
        type: Type.OBJECT,
        properties: {
          summary: {
            type: Type.STRING,
            description: 'Summary of the transcription',
          },
          total_speakers: {
            type: Type.NUMBER,
            description: 'Total number of distinct speakers',
            nullable: true,
          },
          segments: {
            type: Type.ARRAY,
            description: 'Array of corrected transcription segments',
            items: {
              type: Type.OBJECT,
              properties: {
                speaker: {
                  type: Type.STRING,
                  description: 'Speaker identifier',
                },
                timestamp: {
                  type: Type.STRING,
                  description: 'Timestamp in MM:SS or HH:MM:SS format',
                },
                content: {
                  type: Type.STRING,
                  description: 'The corrected transcribed content for this segment',
                },
                language: {
                  type: Type.STRING,
                  description: 'Detected language name',
                  nullable: true,
                },
                language_code: {
                  type: Type.STRING,
                  description: 'ISO language code',
                  nullable: true,
                },
                translation: {
                  type: Type.STRING,
                  description: 'Translation if different from content',
                  nullable: true,
                },
                speaker_characteristics: {
                  type: Type.STRING,
                  description: 'Voice characteristics that distinguish this speaker',
                  nullable: true,
                },
              },
              required: ['speaker', 'timestamp', 'content'],
            },
          },
          correction_count: {
            type: Type.NUMBER,
            description: 'Number of corrections made',
          },
        },
        required: ['summary', 'segments', 'correction_count'],
      };

      // Use Gemini 2.5 Flash for cheap, fast correction
      const response = await this.genAI.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: createUserContent([prompt]),
        config: {
          responseMimeType: 'application/json',
          responseSchema: schema,
          maxOutputTokens: 32768, // Increased from 8192 to handle larger transcriptions
          temperature: 0, // Deterministic output for consistent corrections
        },
      });

      const responseText = response.text || '';

      // Parse JSON response
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('[TranscriptionCorrector] Failed to parse JSON response:', parseError);
        console.error('[TranscriptionCorrector] Response length:', responseText.length);
        console.error('[TranscriptionCorrector] Response start:', responseText.substring(0, 500));
        console.error('[TranscriptionCorrector] Response end:', responseText.substring(Math.max(0, responseText.length - 500)));

        // Check if response was truncated
        const isTruncated = !responseText.trim().endsWith('}');
        if (isTruncated) {
          console.error('[TranscriptionCorrector] Response appears truncated (likely hit maxOutputTokens limit)');
        }

        throw new Error(`Invalid JSON response from Gemini: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
      }

      const correctedStructuredData: StructuredTranscription = {
        summary: data.summary || structuredData.summary,
        total_speakers: data.total_speakers,
        segments: data.segments || structuredData.segments,
      };
      const correctionCount = data.correction_count || 0;

      const processingTimeMs = Date.now() - startTime;
      console.log(
        `[TranscriptionCorrector] Made ${correctionCount} corrections in ${processingTimeMs}ms`
      );

      // Convert structured data back to text format
      const correctedText = this.structuredDataToText(correctedStructuredData);

      return {
        correctedText,
        correctedStructuredData,
        correctionCount,
        processingTimeMs,
      };
    } catch (error) {
      console.error('[TranscriptionCorrector] Structured correction failed:', error);
      // Don't throw - return original data so transcription can continue
      console.warn('[TranscriptionCorrector] Continuing with uncorrected structured data');
      const originalText = this.structuredDataToText(structuredData);
      return {
        correctedText: originalText,
        correctedStructuredData: structuredData,
        processingTimeMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Build prompt for text correction
   */
  private buildCorrectionPrompt(
    text: string,
    languageCode: string,
    preserveTimestamps: boolean,
    preserveSpeakers: boolean,
    previousContext?: string,
    nextContext?: string
  ): string {
    const languageName = languageCode === 'el' ? 'Greek' : 'the target language';

    let prompt = `You are an expert ${languageName} transcription corrector. Your job is to fix audio transcription errors using context and language knowledge.

**CORE PRINCIPLE:** Fix words that are CLEARLY wrong (non-existent or nonsensical), but PRESERVE correct words even if unusual or unfamiliar.

**PRIORITY 1: NON-EXISTENT WORDS (Always Fix)**
- Words that don't exist in ${languageName} dictionaries → Find phonetically-similar real word
${languageCode === 'el' ? '- Missing accents make words non-existent (e.g., "νερο" doesn\'t exist, "νερό" does)' : ''}
- Only fix if you're confident the word is truly non-existent, not just rare or specialized

**PRIORITY 2: USE CONTEXT INTELLIGENTLY**
- Read the ENTIRE text to understand the topic/domain
- Use context clues to fix ambiguous words
- Different domains have different terminology:
  * Government/Municipal contexts
  * Educational/Academic contexts
  * Sports/Athletics contexts
  * Business/Corporate contexts
  * Geographic/Location references
- Context helps distinguish between phonetically-similar words

${languageCode === 'el' ? `**PRIORITY 3: GREEK DIACRITICS (τόνοι)**
- Every Greek word (except monosyllables and exceptions) needs an accent
- Fix ALL missing or wrong accents
- This is NOT optional - accents are mandatory in Greek
` : ''}
**PRIORITY ${languageCode === 'el' ? '4' : '3'}: PROPER NOUNS**
- **Context-based detection**: Words following titles are likely proper nouns
- **Semantic check**: If a word is grammatically correct but semantically nonsensical in context, it might be a mishearing of a proper noun
- Fix proper nouns ONLY if:
  1. They're clearly misspelled (phonetic errors, missing accents)
  2. You can confidently identify the correct form
- **When uncertain about a proper noun, PRESERVE it** - don't "correct" to a common word just because that word exists
- Unknown proper nouns should stay as-is - they might be correct regional names, surnames, or organizations

**WHAT TO FIX:**
✅ Non-existent words (ALWAYS - but verify they're truly non-existent)
${languageCode === 'el' ? '✅ Missing/wrong accents (ALWAYS)\n' : ''}✅ Obvious phonetic errors you can confidently fix with context
✅ Clearly misspelled proper nouns you recognize with certainty

**WHAT NOT TO FIX:**
❌ Correct words (even if unusual, technical, or unfamiliar to you)
❌ Proper nouns you don't recognize (they might be correct - don't assume)
❌ Dialectical variations or regional speech
❌ Domain-specific jargon (unless clearly wrong)
❌ **Timestamps** - PRESERVE the EXACT format (e.g., [0:13], [1:27:45]). DO NOT change brackets, colons, or numbers
❌ **Speaker labels** - PRESERVE the EXACT format (e.g., "Speaker 1:", "Speaker 2:"). DO NOT change capitalization or punctuation
❌ Overall meaning or structure

**CRITICAL FORMAT RULE**: The transcription uses the format "[timestamp] Speaker X: content". You must:
1. Keep the EXACT timestamp format: [MM:SS] or [HH:MM:SS] with square brackets
2. Keep the EXACT speaker format: "Speaker 1:", "Speaker 2:", etc.
3. Keep blank lines between segments
4. ONLY correct the content (the text after the speaker label)

**CORRECTION STRATEGY:**
1. Read full text to identify context/domain
2. Fix ALL truly non-existent words${languageCode === 'el' ? ' and missing accents' : ''}
3. Use context to fix ambiguous cases
4. When uncertain about ANY word (especially proper nouns), PRESERVE IT - don't guess

`;

    if (previousContext || nextContext) {
      prompt += `**CROSS-CHUNK CONTEXT:**\n`;
      if (previousContext) {
        prompt += `Previous: "${previousContext}"\n`;
      }
      if (nextContext) {
        prompt += `Next: "${nextContext}"\n`;
      }
      prompt += `\n`;
    }

    prompt += `**INPUT TEXT TO CORRECT:**
${text}

**OUTPUT FORMAT:**
{
  "corrected_text": "the fully corrected transcription",
  "correction_count": number_of_corrections_made
}

**FORMAT PRESERVATION EXAMPLE:**
INPUT:
[0:13] Speaker 1: [some text with errors]

IF you find a non-existent word or clear error, OUTPUT:
[0:13] Speaker 1: [text with only the actual errors corrected]

Notice: Timestamps and speaker labels stay EXACTLY the same. Only correct genuine errors in the content.

IMPORTANT: Be AGGRESSIVE with true errors (non-existent words${languageCode === 'el' ? ', missing accents' : ''}), but CONSERVATIVE with unfamiliar words - if a word might be correct (proper noun, technical term, regional variant), PRESERVE it. When in doubt, keep it.`;

    return prompt;
  }

  /**
   * Build prompt for structured data correction
   */
  private buildStructuredCorrectionPrompt(
    structuredData: StructuredTranscription,
    languageCode: string,
    previousContext?: string,
    nextContext?: string
  ): string {
    const languageName = languageCode === 'el' ? 'Greek' : 'the target language';

    let prompt = `You are an expert ${languageName} transcription corrector. Fix audio transcription errors using context.

**FIX IMMEDIATELY:**
1. **NON-EXISTENT WORDS**: Words that don't exist in ${languageName} → Find phonetically-similar real word that makes sense in context
   - Verify the word is truly non-existent, not just rare or specialized

${languageCode === 'el' ? `2. **MISSING ACCENTS (τόνοι)**: Every Greek word needs correct accent
   - This is MANDATORY, not optional

3. **OBVIOUS PHONETIC ERRORS**: Use context to identify and fix
` : '2. **OBVIOUS PHONETIC ERRORS**: Use context to identify and fix\n'}
**USE CONTEXT:**
- Read ALL segments to understand the topic/domain
- Use context to fix ambiguous words:
  * Government/Municipal contexts
  * Educational/Academic contexts
  * Sports/Athletics contexts
  * Business/Corporate contexts
- **Proper noun preservation**: Words after titles are likely names - don't "correct" them unless you're certain they're wrong
- Fix proper nouns ONLY if:
  1. They're clearly misspelled AND you confidently recognize the correct form
  2. Context strongly suggests a specific correction
- **When uncertain, PRESERVE the original** - unfamiliar proper nouns might be correct

**PRESERVE:**
- Timestamps (exact format)
- Speaker labels (exact format)
- Correct words (even if unusual or unfamiliar to you)
- Unknown proper nouns (don't guess - they might be correct)
- Domain-specific jargon and technical terms

`;

    if (previousContext || nextContext) {
      prompt += `**CROSS-CHUNK CONTEXT:**\n`;
      if (previousContext) {
        prompt += `Previous: "${previousContext}"\n`;
      }
      if (nextContext) {
        prompt += `Next: "${nextContext}"\n`;
      }
      prompt += `\n`;
    }

    prompt += `**INPUT DATA:**
${JSON.stringify(structuredData, null, 2)}

**OUTPUT FORMAT:**
Return corrected structured data with same schema. Fix content fields based on the rules above. Include correction_count.

RULE: Fix true errors (non-existent words${languageCode === 'el' ? ', missing accents' : ''}) aggressively. But be conservative with unfamiliar words - if it might be correct (proper noun, technical term), preserve it. When in doubt, keep the original.`;

    return prompt;
  }

  /**
   * Correct a transcription by listening to the audio (audio-aware correction)
   * This is more accurate but costs more as it processes the audio again
   */
  private async correctTranscriptionWithAudio(
    text: string,
    audioInput: TranscriptionInput,
    languageCode: string,
    preserveTimestamps: boolean,
    preserveSpeakers: boolean,
    previousContext?: string,
    nextContext?: string
  ): Promise<CorrectionResult> {
    const startTime = Date.now();

    try {
      // Upload audio file to Google
      console.log('[TranscriptionCorrector] Uploading audio for verification...');
      const uploadedFile = await this.genAI.files.upload({
        file: new Blob([audioInput.buffer], { type: audioInput.mimeType }),
        config: {
          mimeType: audioInput.mimeType,
          displayName: audioInput.fileName,
        },
      });

      console.log('[TranscriptionCorrector] Audio uploaded:', uploadedFile.uri);

      // Wait for file to be processed
      let fileMetadata = await this.genAI.files.get({ name: uploadedFile.name! });
      while (fileMetadata.state === FileState.PROCESSING) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        fileMetadata = await this.genAI.files.get({ name: uploadedFile.name! });
      }

      if (fileMetadata.state === FileState.FAILED) {
        throw new Error('Audio file processing failed');
      }

      console.log('[TranscriptionCorrector] Audio ready, starting audio-aware correction...');

      // Build prompt for audio-aware correction
      const prompt = this.buildAudioAwareCorrectionPrompt(
        text,
        languageCode,
        previousContext,
        nextContext
      );

      // Define schema for structured output
      const schema = {
        type: Type.OBJECT,
        properties: {
          corrected_text: {
            type: Type.STRING,
            description: 'The corrected transcription text with all errors fixed',
          },
          correction_count: {
            type: Type.NUMBER,
            description: 'Number of corrections made',
          },
        },
        required: ['corrected_text', 'correction_count'],
      };

      // Use Gemini 2.5 Flash with audio + text
      const response = await this.genAI.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: createUserContent([
          createPartFromUri(fileMetadata.uri!, fileMetadata.mimeType!),
          prompt,
        ]),
        config: {
          responseMimeType: 'application/json',
          responseSchema: schema,
          maxOutputTokens: 32768,
          temperature: 0, // Deterministic output
        },
      });

      const responseText = response.text || '';

      // Parse JSON response
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('[TranscriptionCorrector] Failed to parse JSON response:', parseError);
        console.error('[TranscriptionCorrector] Response length:', responseText.length);
        console.error('[TranscriptionCorrector] Response start:', responseText.substring(0, 500));
        console.error('[TranscriptionCorrector] Response end:', responseText.substring(Math.max(0, responseText.length - 500)));

        throw new Error(`Invalid JSON response from Gemini: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
      }

      const correctedText = data.corrected_text || text;
      const correctionCount = data.correction_count || 0;

      const processingTimeMs = Date.now() - startTime;
      console.log(
        `[TranscriptionCorrector] Audio-aware correction made ${correctionCount} corrections in ${processingTimeMs}ms`
      );

      // Clean up uploaded file
      await this.genAI.files.delete({ name: uploadedFile.name! });

      return {
        correctedText,
        correctionCount,
        processingTimeMs,
      };
    } catch (error) {
      console.error('[TranscriptionCorrector] Audio-aware correction failed:', error);
      // Fall back to original text
      console.warn('[TranscriptionCorrector] Falling back to original text');
      return {
        correctedText: text,
        processingTimeMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Build prompt for audio-aware correction
   */
  private buildAudioAwareCorrectionPrompt(
    text: string,
    languageCode: string,
    previousContext?: string,
    nextContext?: string
  ): string {
    const languageName = languageCode === 'el' ? 'Greek' : 'the target language';

    let prompt = `You are an expert ${languageName} transcription corrector with access to BOTH the audio and the text transcription.

**YOUR TASK:** Listen to the audio and compare it with the text transcription below. Fix any errors you hear.

**CORE PRINCIPLE:** You can HEAR the audio, so use your ears to verify what was actually said. Don't just read the text - LISTEN to it.

**PRIORITY 1: AUDIO VERIFICATION (Your Superpower)**
- Listen to the audio carefully for every single word
- If the text contains a word but you HEAR a different word in the audio, fix it to match what you actually hear
- If the text has wrong accents, verify the correct pronunciation from the audio
- Trust your ears over the text when there's a mismatch
- Do NOT assume or guess - only correct based on what you actually hear

**PRIORITY 2: NON-EXISTENT WORDS**
- Words that don't exist in ${languageName} dictionaries → Fix using what you HEAR in the audio
- Listen carefully to verify phonetically-similar words against the actual pronunciation
- The audio is your source of truth

**PRIORITY 3: PROPER NOUNS (CRITICAL)**
- Listen carefully to ALL names, places, and organizations
- Words following titles (like "κύριος/κυρία/Δρ./Καθηγητής") are likely proper nouns - listen extra carefully
- If you hear a proper noun that's misspelled in the text, fix it based on the pronunciation you hear
- Do NOT change proper nouns based on assumptions - only based on what you clearly hear in the audio
- Unknown names should be transcribed exactly as they sound, not "corrected" to known names

**PRIORITY 4: ${languageCode === 'el' ? 'GREEK DIACRITICS (τόνοι)' : 'DIACRITICS'}**
- Listen to where the stress falls in the audio
- Fix accents based on the actual pronunciation you hear
${languageCode === 'el' ? '- Every Greek word (except monosyllables) needs the accent on the stressed syllable' : ''}

**PRIORITY 5: CONTEXT + AUDIO**
- Use the audio context (tone, pauses, emphasis) to understand meaning
- Verify ambiguous words by listening to surrounding audio
- Let the audio guide you, not your assumptions about what "should" be said

**WHAT TO FIX:**
✅ Words where the text doesn't match what you HEAR in the audio (ALWAYS)
✅ Non-existent words - replace with what you actually hear (ALWAYS)
✅ Missing/wrong accents based on audio pronunciation (ALWAYS)
✅ Misspelled proper nouns - correct to match the pronunciation you hear
✅ Any clear mismatches between audio and text

**WHAT NOT TO FIX:**
❌ Text that matches what you hear in the audio (even if unusual, unknown, or unfamiliar)
❌ Proper nouns you don't recognize - if they match the audio pronunciation, keep them
❌ **Timestamps** - PRESERVE the EXACT format (e.g., [0:13], [1:27:45]). DO NOT change brackets, colons, or numbers
❌ **Speaker labels** - PRESERVE the EXACT format (e.g., "Speaker 1:", "Speaker 2:"). DO NOT change capitalization or punctuation
❌ Correct transcriptions

**CRITICAL FORMAT RULE**: The transcription uses the format "[timestamp] Speaker X: content". You must:
1. Keep the EXACT timestamp format: [MM:SS] or [HH:MM:SS] with square brackets
2. Keep the EXACT speaker format: "Speaker 1:", "Speaker 2:", etc.
3. Keep blank lines between segments
4. ONLY correct the content (the text after the speaker label)

`;

    if (previousContext || nextContext) {
      prompt += `**CROSS-CHUNK CONTEXT:**\n`;
      if (previousContext) {
        prompt += `Previous: "${previousContext}"\n`;
      }
      if (nextContext) {
        prompt += `Next: "${nextContext}"\n`;
      }
      prompt += `\n`;
    }

    prompt += `**TRANSCRIPTION TO VERIFY:**
${text}

**OUTPUT FORMAT:**
{
  "corrected_text": "the fully corrected transcription based on what you HEARD in the audio",
  "correction_count": number_of_corrections_made
}

**FORMAT PRESERVATION EXAMPLE:**
INPUT:
[0:13] Speaker 1: [some text with an error]

IF YOU HEAR a different word in the audio, OUTPUT:
[0:13] Speaker 1: [text with the word corrected to match what you heard]

Notice: Timestamps and speaker labels stay EXACTLY the same. Only correct the content based on what you actually hear.

IMPORTANT: Listen to the audio carefully for EVERY word. Your advantage is that you can HEAR what was actually said. Only make corrections based on what you clearly hear - don't assume or guess based on what you think "should" be said.`;

    return prompt;
  }

  /**
   * Convert structured data to text format
   */
  private structuredDataToText(data: StructuredTranscription): string {
    return data.segments
      .map(segment => `${segment.timestamp} ${segment.speaker}: ${segment.content}`)
      .join('\n\n');
  }
}
