import type { TranscriptionInput } from './types';
import { GoogleGenAI, FileState, Type, createUserContent, createPartFromUri } from '@google/genai';

/**
 * Options for keyterm extraction
 */
export interface KeytermExtractionOptions {
  /** Maximum number of keyterms to return (default: 100, ElevenLabs limit) */
  maxKeyterms?: number;
  /** Minimum term frequency to include (default: 2) */
  minFrequency?: number;
  /** Minimum term length in characters (default: 3) */
  minLength?: number;
  /** Target language for extraction (default: 'el' for Greek) */
  languageCode?: string;
}

/**
 * Extract keyterms from audio using a cheap model (Gemini Flash)
 * to improve downstream transcription accuracy with ElevenLabs Scribe
 */
export class KeytermExtractor {
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
   * Extract keyterms from audio file
   */
  async extractKeyterms(
    input: TranscriptionInput,
    options: KeytermExtractionOptions = {}
  ): Promise<string[]> {
    const {
      maxKeyterms = 100, // ElevenLabs supports up to 100 keyterms
      minLength = 2,
      languageCode = 'el',
    } = options;

    const startTime = Date.now();

    try {
      console.log('[KeytermExtractor] Starting keyterm extraction with Gemini Flash...');

      // Upload file to Google
      const uploadedFile = await this.genAI.files.upload({
        file: new Blob([input.buffer], { type: input.mimeType }),
        config: {
          mimeType: input.mimeType,
          displayName: input.fileName,
        },
      });

      console.log('[KeytermExtractor] File uploaded:', uploadedFile.uri);

      // Wait for file to be processed
      let fileMetadata = await this.genAI.files.get({ name: uploadedFile.name! });
      while (fileMetadata.state === FileState.PROCESSING) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        fileMetadata = await this.genAI.files.get({ name: uploadedFile.name! });
      }

      if (fileMetadata.state === FileState.FAILED) {
        throw new Error('File processing failed');
      }

      console.log('[KeytermExtractor] File ready, extracting keyterms...');

      // Build prompt for keyterm extraction
      const prompt = this.buildKeytermExtractionPrompt(languageCode);

      // Define schema for structured output - simplified to just strings to avoid truncation
      const schema = {
        type: Type.OBJECT,
        properties: {
          keyterms: {
            type: Type.ARRAY,
            description: 'Array of keyterm strings (max 100 terms, 50 chars each)',
            items: {
              type: Type.STRING,
            },
          },
        },
        required: ['keyterms'],
      };

      // Use Gemini 2.5 Flash for cheap, fast extraction
      const response = await this.genAI.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: createUserContent([
          createPartFromUri(fileMetadata.uri!, fileMetadata.mimeType!),
          prompt,
        ]),
        config: {
          responseMimeType: 'application/json',
          responseSchema: schema,
          maxOutputTokens: 8192, // Increased to handle up to 100 keyterms with longer Greek terms
        },
      });

      const text = response.text || '';

      // Parse JSON response with error handling and fallback
      let data;
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        console.error('[KeytermExtractor] Failed to parse JSON response:', parseError);
        console.error('[KeytermExtractor] Response length:', text.length);
        console.error('[KeytermExtractor] Response start:', text.substring(0, 500));
        console.error('[KeytermExtractor] Response end:', text.substring(Math.max(0, text.length - 500)));

        // Check if response was truncated
        const isTruncated = !text.trim().endsWith('}') && !text.trim().endsWith(']');
        if (isTruncated) {
          console.error('[KeytermExtractor] Response appears truncated (likely hit maxOutputTokens limit)');
        }

        // Attempt to salvage partial JSON by extracting keyterms array
        console.log('[KeytermExtractor] Attempting to salvage partial JSON...');
        const salvaged = this.salvagePartialJSON(text);

        if (salvaged && salvaged.length > 0) {
          console.log(`[KeytermExtractor] Salvaged ${salvaged.length} keyterms from partial JSON`);
          data = { keyterms: salvaged };
        } else {
          // Complete failure - return empty array
          console.warn('[KeytermExtractor] Could not salvage any keyterms, continuing without keyterms');
          return [];
        }
      }

      const keyterms: string[] = data.keyterms || [];

      // Filter keyterms by length and limit to max
      const filtered = keyterms
        .filter(term => term && term.length >= minLength && term.length <= 50)
        .slice(0, maxKeyterms);

      const processingTimeMs = Date.now() - startTime;
      console.log(
        `[KeytermExtractor] Extracted ${filtered.length} keyterms in ${processingTimeMs}ms:`,
        filtered.slice(0, 10).join(', ') + (filtered.length > 10 ? '...' : '')
      );

      // Clean up uploaded file
      await this.genAI.files.delete({ name: uploadedFile.name! });

      return filtered;
    } catch (error) {
      console.error('[KeytermExtractor] Extraction failed:', error);
      // Don't throw - return empty array so transcription can continue
      console.warn('[KeytermExtractor] Continuing without keyterms');
      return [];
    }
  }

  /**
   * Attempts to salvage keyterms from partial/truncated JSON
   * @param text - Partial JSON text
   * @returns Array of salvaged keyterms, or empty array if nothing can be salvaged
   */
  private salvagePartialJSON(text: string): string[] {
    try {
      // Try to extract the keyterms array even if JSON is incomplete
      const keytermMatch = text.match(/"keyterms"\s*:\s*\[([\s\S]*?)(?:\]|$)/);

      if (!keytermMatch) {
        return [];
      }

      const arrayContent = keytermMatch[1];

      // Extract all complete quoted strings from the array
      const stringMatches = arrayContent.matchAll(/"([^"]+)"/g);
      const keyterms: string[] = [];

      for (const match of stringMatches) {
        if (match[1] && match[1].length >= 2 && match[1].length <= 50) {
          keyterms.push(match[1]);
        }
      }

      return keyterms;
    } catch (error) {
      console.error('[KeytermExtractor] Failed to salvage partial JSON:', error);
      return [];
    }
  }

  /**
   * Build prompt for keyterm extraction
   */
  private buildKeytermExtractionPrompt(languageCode: string): string {
    const languageName = languageCode === 'el' ? 'Greek' : 'the target language';

    return `You are analyzing audio to extract up to 100 important keyterms that will help improve transcription accuracy.

Your task is to identify and extract the most important terms:
1. **Proper nouns**: Names of people, places, organizations, brands
2. **Technical terms**: Specialized vocabulary, jargon, domain-specific words
3. **Organizations**: Company names, institution names
4. **Locations**: Cities, countries, landmarks
5. **Acronyms**: Abbreviations and initialisms (e.g., "ΠΕΔ", "CEO", "EU")

CRITICAL REQUIREMENTS:
- Extract up to 100 of the MOST IMPORTANT terms
- Focus on ${languageName} terms that are difficult to transcribe correctly
- Each keyterm should be a single word or short phrase (max 50 characters)
- Prioritize terms that appear multiple times in the audio
- DO NOT include common words like "the", "and", "is", "για", "στο", etc.
- Include both Greek and English terms if the audio is mixed-language
- Order by importance (most important first)

Return a JSON object with this exact format:
{
  "keyterms": ["term1", "term2", "term3", ...]
}

Just an array of strings - no metadata needed. Maximum 100 terms.`;
  }

}
