import { GoogleGenAI, Type, createUserContent } from '@google/genai';
import type { StructuredTranscription } from './types';

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
    } = options;

    try {
      console.log('[TranscriptionCorrector] Starting correction with Gemini Flash...');

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
- Greek names: Fix phonetic errors (e.g., "Γιώργος" not "Γιωργος")
- Place names: Fix if clearly misspelled AND you recognize the correct form
- Organizations: Fix common Greek organizations if you recognize them
- Titles: Κύριε/Κυρία + name, professional titles

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
${preserveTimestamps ? '❌ Timestamps - keep exactly as is\n' : ''}${preserveSpeakers ? '❌ Speaker labels - keep exactly as is\n' : ''}❌ Overall meaning or structure

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
- Fix proper nouns ONLY if you confidently recognize them

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
   * Convert structured data to text format
   */
  private structuredDataToText(data: StructuredTranscription): string {
    return data.segments
      .map(segment => `${segment.timestamp} ${segment.speaker}: ${segment.content}`)
      .join('\n\n');
  }
}
