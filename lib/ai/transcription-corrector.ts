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

    let prompt = `You are an expert ${languageName} transcription corrector. Your job is to fix audio transcription errors using context and Greek language knowledge.

**CORE PRINCIPLE:** Fix words that are CLEARLY wrong (non-existent or nonsensical), but PRESERVE correct words even if unusual.

**PRIORITY 1: NON-EXISTENT WORDS (Always Fix)**
- Words that don't exist in Greek dictionaries → Find phonetically-similar real word
- Examples of common errors:
  * "ήμο" → "Δήμο" (municipality)
  * "Αρρωδιά" → "Ροδιά" (village name - if context suggests a place)
  * "νερο" → "νερό" (missing accent)
  * "Δημος" → "Δήμος" (missing accent)

**PRIORITY 2: USE CONTEXT INTELLIGENTLY**
- Read the ENTIRE text to understand the topic (government, sports, university, interview, etc.)
- Use context clues to fix ambiguous words:
  * If listing place names → fix misspelled places
  * If discussing organizations → fix organization names
  * If academic context → fix technical terms
  * If sports context → fix team/player names
- Common Greek contexts you might encounter:
  * **Government/Municipality**: Δήμος, Περιφέρεια, Υπουργείο, Νομός, ΠΕΔ, ΔΕΥΑ, ΔΕΔΔΗΕ
  * **Education**: Πανεπιστήμιο, Σχολείο, Καθηγητής, Φοιτητής, Διδάσκαλος
  * **Sports**: Ομάδα, Γήπεδο, Αθλητής, Προπονητής, Πρωτάθλημα
  * **Business**: Εταιρεία, Επιχείρηση, Διευθυντής, Υπάλληλος
  * **Geography**: City/village names across Greece (not just Crete)

**PRIORITY 3: GREEK DIACRITICS (τόνοι)**
- Every Greek word (except monosyllables and exceptions) needs an accent
- Fix ALL missing or wrong accents
- This is NOT optional - accents are mandatory in Greek

**PRIORITY 4: PROPER NOUNS**
- **Context-based detection**: Words following titles (κύριο/κυρία/κύριε/Δρ./Καθηγητής) are likely proper nouns
- **Semantic check**: If a grammatically correct Greek word appears in a context where it makes no semantic sense, consider if it might be a mishearing of a proper noun
- Greek names: Fix phonetic errors (e.g., "Γιώργος" not "Γιωργος")
- Place names: Fix if clearly misspelled AND you recognize the correct form
- Organizations: Fix common Greek organizations if you recognize them
- **When uncertain about a proper noun, PRESERVE it** - don't "correct" it to a common word just because the common word exists

**WHAT TO FIX:**
✅ Non-existent words (ALWAYS)
✅ Missing/wrong accents (ALWAYS)
✅ Obvious phonetic errors you can confidently fix with context
✅ Misspelled proper nouns you recognize

**WHAT NOT TO FIX:**
❌ Correct words (even if unusual or technical)
❌ Proper nouns you don't recognize (might be correct)
❌ Dialectical variations or regional speech
❌ Technical jargon specific to the domain (unless clearly wrong)
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
2. Fix ALL non-existent words and missing accents
3. Use context to fix ambiguous cases
4. When uncertain about a proper noun, KEEP IT (don't guess)

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
[0:13] Speaker 1: Ευχαριστούμε τον κύριο Χλωρού για την τοποθέτησή του.

IF "Χλωρού" is wrong (doesn't exist in Greek or seems like a mishearing), OUTPUT:
[0:13] Speaker 1: Ευχαριστούμε τον κύριο Ξυλουρή για την τοποθέτησή του.

Notice: [0:13] stays [0:13], "Speaker 1:" stays "Speaker 1:", ONLY the erroneous word was corrected.

IMPORTANT: Be AGGRESSIVE with corrections. Non-existent words are ALWAYS errors. Fix them!`;

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
1. **NON-EXISTENT WORDS**: Words that don't exist in Greek → Find phonetically-similar real word
   - Examples: "ήμο" → "Δήμο", "νερο" → "νερό", "Δημος" → "Δήμος"

2. **MISSING ACCENTS (τόνοι)**: Every Greek word needs correct accent
   - This is MANDATORY, not optional

3. **OBVIOUS PHONETIC ERRORS**: Use context to identify and fix

**USE CONTEXT:**
- Read ALL segments to understand the topic (government, sports, education, business, etc.)
- Use context to fix ambiguous words:
  * Government context → fix Δήμος, Περιφέρεια, organization names
  * Education context → fix Πανεπιστήμιο, professor/student names
  * Sports context → fix team/player names
  * Business context → fix company/position names
- **Proper noun preservation**: Words after titles (κύριο/κυρία/κύριε/Δρ.) are likely names - don't "correct" them unless you're certain they're wrong
- Fix proper nouns ONLY if you confidently recognize them OR if context strongly suggests a correction

**PRESERVE:**
- Timestamps (exact format)
- Speaker labels (exact format)
- Correct words (even if unusual)
- Unknown proper nouns (don't guess)
- Domain-specific jargon

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
Return corrected structured data with same schema. Fix content fields aggressively. Include correction_count.

RULE: Non-existent words are ALWAYS errors. Fix them without hesitation!`;

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
    preserveTimestamps: boolean,
    preserveSpeakers: boolean,
    previousContext?: string,
    nextContext?: string
  ): string {
    const languageName = languageCode === 'el' ? 'Greek' : 'the target language';

    let prompt = `You are an expert ${languageName} transcription corrector with access to BOTH the audio and the text transcription.

**YOUR TASK:** Listen to the audio and compare it with the text transcription below. Fix any errors you hear.

**CORE PRINCIPLE:** You can HEAR the audio, so use your ears to verify what was actually said. Don't just read the text - LISTEN to it.

**PRIORITY 1: AUDIO VERIFICATION (Your Superpower)**
- Listen to the audio carefully
- If the text says "Χλωρού" but you HEAR "Ξυλουρής", fix it
- If the text has wrong accents, verify the correct pronunciation from the audio
- Trust your ears over the text when there's a mismatch

**PRIORITY 2: NON-EXISTENT WORDS**
- Words that don't exist in ${languageName} dictionaries → Fix using what you HEAR in the audio
- Verify phonetically-similar words by listening to the actual pronunciation

**PRIORITY 3: PROPER NOUNS (CRITICAL)**
- Listen carefully to names, places, organizations
- If a word after "κύριο/κυρία" sounds like a surname but the text has a common word, fix it based on what you HEAR
- Trust the audio pronunciation for proper nouns

**PRIORITY 4: GREEK DIACRITICS (τόνοι)**
- Listen to where the stress falls in the audio
- Fix accents based on the actual pronunciation you hear
- Every Greek word (except monosyllables) needs the accent on the stressed syllable

**PRIORITY 5: CONTEXT + AUDIO**
- Use the audio context (tone, pauses, emphasis) to understand meaning
- Verify ambiguous words by listening to surrounding audio

**WHAT TO FIX:**
✅ Words where the text doesn't match what you HEAR in the audio (ALWAYS)
✅ Non-existent words (ALWAYS)
✅ Missing/wrong accents based on audio pronunciation (ALWAYS)
✅ Proper nouns that sound different from what's written
✅ Any clear mismatches between audio and text

**WHAT NOT TO FIX:**
❌ Text that matches what you hear in the audio (even if unusual)
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
[0:13] Speaker 1: Ευχαριστούμε τον κύριο Χλωρού για την τοποθέτησή του.

IF YOU HEAR "Ξυλουρή" instead of "Χλωρού", OUTPUT:
[0:13] Speaker 1: Ευχαριστούμε τον κύριο Ξυλουρή για την τοποθέτησή του.

Notice: [0:13] stays [0:13], "Speaker 1:" stays "Speaker 1:", ONLY the word "Χλωρού" was corrected.

IMPORTANT: Listen to the audio carefully. Your advantage is that you can HEAR what was actually said. Use that advantage!`;

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
