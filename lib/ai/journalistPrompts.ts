/**
 * Prompt builders for the AI content toolkit (journalists & podcasters).
 *
 * Each generator turns a transcription (already formatted with `[MM:SS] Speaker:`
 * lines) into GitHub-flavored Markdown that the user can edit and download.
 */

import { ResolvedSegment } from '@/lib/export/types';

/**
 * The available AI content generators.
 */
export type AiToolType = 'summary' | 'article' | 'show-notes' | 'clips';

/**
 * Request body for the AI generate API endpoint.
 */
export interface AiGenerateRequest {
  segments: ResolvedSegment[];
  type: AiToolType;
  language?: 'el' | 'en';
}

/**
 * Response from the AI generate API endpoint.
 */
export interface AiGenerateResponse {
  success: boolean;
  markdown?: string;
  error?: string;
  processingTimeMs?: number;
  /** When denied for entitlement reasons: the lowest plan that unlocks the tool. */
  requiredPlan?: string | null;
}

/**
 * All valid tool types, exported for runtime validation.
 */
export const AI_TOOL_TYPES: AiToolType[] = ['summary', 'article', 'show-notes', 'clips'];

/**
 * Type guard used by the API route to validate untrusted input.
 */
export function isAiToolType(value: unknown): value is AiToolType {
  return typeof value === 'string' && (AI_TOOL_TYPES as string[]).includes(value);
}

/**
 * Language directive prepended to every prompt.
 *
 * The output must always follow the transcript's own language. The optional
 * `language` hint only nudges the default when the transcript is ambiguous.
 */
function buildLanguageDirective(language: 'el' | 'en'): string {
  const preferred = language === 'en' ? 'στα Αγγλικά' : 'στα Ελληνικά';
  return `ΓΛΩΣΣΑ: Απάντησε ΑΠΟΚΛΕΙΣΤΙΚΑ στην ΙΔΙΑ γλώσσα με τη μεταγραφή. Αν η μεταγραφή είναι στα Ελληνικά, γράψε στα Ελληνικά· αν είναι στα Αγγλικά, γράψε στα Αγγλικά. Σε περίπτωση αμφιβολίας, προτίμησε να γράψεις ${preferred}. Μην μεταφράζεις το περιεχόμενο σε άλλη γλώσσα.`;
}

/**
 * Shared instructions about formatting and timestamp usage.
 */
const COMMON_RULES = `ΚΑΝΟΝΕΣ:
- Η έξοδος πρέπει να είναι σε μορφή GitHub-flavored Markdown.
- Χρησιμοποίησε τις χρονικές σημάνσεις \`[MM:SS]\` που υπάρχουν ΗΔΗ στην αρχή κάθε γραμμής της μεταγραφής. Μην επινοείς νέες χρονικές σημάνσεις και μην αλλάζεις τη μορφή τους.
- Απόδωσε τα αποσπάσματα/δηλώσεις με ακρίβεια στον σωστό ομιλητή, όπως εμφανίζεται στη μεταγραφή.
- Μην επινοείς γεγονότα, ονόματα ή αριθμούς που δεν υπάρχουν στη μεταγραφή.
- Επέστρεψε ΜΟΝΟ το ζητούμενο περιεχόμενο σε Markdown, χωρίς επιπλέον εισαγωγικά σχόλια.`;

/**
 * Per-tool instruction block.
 */
function buildToolInstructions(type: AiToolType): string {
  switch (type) {
    case 'summary':
      return `ΕΡΓΑΣΙΑ: Δημιούργησε μια σύνοψη (TL;DR) της μεταγραφής.

Δομή:
1. Μια ενότητα "## TL;DR" με 3–5 bullet points που συνοψίζουν τα βασικότερα σημεία.
2. Μια ενότητα "## Προτεινόμενα quotes" με 3–6 αποσπάσματα-κλειδιά (pull-quotes). Κάθε απόσπασμα σε δική του γραμμή με τη μορφή:
   - \`[MM:SS]\` **Ομιλητής**: "το ακριβές απόσπασμα"
   Επίλεξε δυνατά, αντιπροσωπευτικά αποσπάσματα και διατήρησε τη χρονική σήμανση και τον ομιλητή από τη μεταγραφή.`;

    case 'article':
      return `ΕΡΓΑΣΙΑ: Συνέταξε ένα προσχέδιο δημοσιογραφικού άρθρου βασισμένο στη μεταγραφή.

Δομή:
1. Έναν τίτλο (headline) ως "# " επικεφαλίδα.
2. Μια εισαγωγική παράγραφο (lede) που απαντά στα βασικά ερωτήματα (ποιος, τι, πότε, πού, γιατί).
3. Κύριο σώμα με παραγράφους που αναπτύσσουν το θέμα και ενσωματώνουν 2–4 αυτούσια αποσπάσματα με απόδοση στον ομιλητή, π.χ.: Όπως ανέφερε ο/η **Ομιλητής** \`[MM:SS]\`, "το απόσπασμα".
4. Ουδέτερο, ισορροπημένο ύφος τρίτου προσώπου.
5. Στο τέλος πρόσθεσε μια σημείωση με πλάγια γραφή ότι πρόκειται για προσχέδιο που χρειάζεται επαλήθευση των γεγονότων (fact-check) πριν τη δημοσίευση.`;

    case 'show-notes':
      return `ΕΡΓΑΣΙΑ: Δημιούργησε show notes για podcast επεισόδιο.

Δομή:
1. Μια σύντομη παράγραφο περιγραφής (description) του επεισοδίου.
2. Μια ενότητα "## Highlights" με bullet points για τα σημαντικότερα σημεία της συζήτησης.
3. Μια ενότητα "## Κεφάλαια / Chapters" με λίστα δεικτών κεφαλαίων που προκύπτουν από αλλαγές θέματος, με τη μορφή:
   - \`[MM:SS]\` Τίτλος κεφαλαίου
   Χρησιμοποίησε τις χρονικές σημάνσεις της μεταγραφής για την αρχή κάθε θεματικής ενότητας.`;

    case 'clips':
      return `ΕΡΓΑΣΙΑ: Πρότεινε 5–6 σύντομα βίντεο-κλιπ κατάλληλα για reels/shorts.

Για κάθε κλιπ χρησιμοποίησε τη μορφή:
### \`[MM:SS–MM:SS]\` Τίτλος
- **Γιατί λειτουργεί:** μια σύντομη εξήγηση για το γιατί αυτό το απόσπασμα είναι ελκυστικό/viral.
- **Απόσπασμα:** "το ακριβές απόσπασμα από τη μεταγραφή"

Επίλεξε τα πιο δυνατά, αυτοτελή και μοιράσιμα σημεία. Χρησιμοποίησε το εύρος χρόνου από τις χρονικές σημάνσεις της μεταγραφής.`;
  }
}

/**
 * Build the full prompt for a given AI tool.
 */
export function buildJournalistPrompt(
  type: AiToolType,
  transcriptionText: string,
  options?: { language?: 'el' | 'en' }
): string {
  const language = options?.language ?? 'el';

  return `Είσαι έμπειρος βοηθός σύνταξης περιεχομένου για δημοσιογράφους και podcasters. Σου δίνεται η μεταγραφή μιας ηχογράφησης/συνέντευξης/επεισοδίου.

${buildLanguageDirective(language)}

${buildToolInstructions(type)}

${COMMON_RULES}

## ΜΕΤΑΓΡΑΦΗ

${transcriptionText}

## ΕΞΟΔΟΣ

Δημιούργησε το ζητούμενο περιεχόμενο σε μορφή Markdown, ακολουθώντας τις παραπάνω οδηγίες.`;
}
