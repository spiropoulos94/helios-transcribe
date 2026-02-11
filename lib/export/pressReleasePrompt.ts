/**
 * Prompt builder for Press Release generation using Gemini AI
 */

import { PressReleaseMetadata } from './pressReleaseTypes';

/**
 * Formats the date for Greek press release format
 */
function formatGreekDate(isoDate: string): string {
  if (!isoDate) return '';

  const date = new Date(isoDate);
  const months = [
    'Ιανουαρίου', 'Φεβρουαρίου', 'Μαρτίου', 'Απριλίου',
    'Μαΐου', 'Ιουνίου', 'Ιουλίου', 'Αυγούστου',
    'Σεπτεμβρίου', 'Οκτωβρίου', 'Νοεμβρίου', 'Δεκεμβρίου'
  ];

  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();

  return `${day} ${month} ${year}`;
}

/**
 * Get tone description in Greek
 */
function getToneDescription(tone: 'formal' | 'neutral' | 'friendly'): string {
  switch (tone) {
    case 'formal':
      return 'επίσημο και επαγγελματικό';
    case 'neutral':
      return 'ουδέτερο και ενημερωτικό';
    case 'friendly':
      return 'φιλικό και προσιτό';
  }
}

/**
 * Builds the complete prompt for Gemini to generate a press release
 */
export function buildPressReleasePrompt(
  metadata: PressReleaseMetadata,
  transcriptionText: string
): string {
  const formattedDate = formatGreekDate(metadata.date);
  const toneDescription = getToneDescription(metadata.tone);

  let prompt = `Είσαι ειδικός στη σύνταξη δελτίων τύπου στα Ελληνικά. Σου παρέχεται η μεταγραφή μιας συνεδρίασης/συνέντευξης/ομιλίας και πρέπει να δημιουργήσεις ένα επαγγελματικό δελτίο τύπου.

## ΠΛΗΡΟΦΟΡΙΕΣ

**Οργανισμός:** ${metadata.organization || '[Δεν προσδιορίστηκε]'}
**Τίτλος/Θέμα:** ${metadata.title || '[Δεν προσδιορίστηκε]'}
**Ημερομηνία:** ${formattedDate || '[Δεν προσδιορίστηκε]'}
**Τοποθεσία:** ${metadata.location || '[Δεν προσδιορίστηκε]'}

**Ύφος:** ${toneDescription}
`;

  if (metadata.targetAudience) {
    prompt += `**Κοινό-στόχος:** ${metadata.targetAudience}\n`;
  }

  if (metadata.keyPoints) {
    prompt += `**Βασικά σημεία προς έμφαση:** ${metadata.keyPoints}\n`;
  }

  // Contact info section
  const hasContactInfo = metadata.contactName || metadata.contactEmail || metadata.contactPhone;
  if (hasContactInfo) {
    prompt += `\n**Στοιχεία Επικοινωνίας:**\n`;
    if (metadata.contactName) prompt += `- Υπεύθυνος: ${metadata.contactName}\n`;
    if (metadata.contactEmail) prompt += `- Email: ${metadata.contactEmail}\n`;
    if (metadata.contactPhone) prompt += `- Τηλέφωνο: ${metadata.contactPhone}\n`;
  }

  prompt += `

## ΟΔΗΓΙΕΣ

1. **Δομή Δελτίου Τύπου:**
   - Επικεφαλίδα (Title): Σύντομη, εντυπωσιακή, περιληπτική
   - Υπότιτλος (Subtitle): Προαιρετικός, δίνει επιπλέον πληροφορία
   - Εισαγωγική παράγραφος: Απαντά στα 5W (Ποιος, Τι, Πότε, Πού, Γιατί)
   - Κύριο σώμα: 2-4 παράγραφοι με λεπτομέρειες
   - Αποσπάσματα/Δηλώσεις: Αν υπάρχουν σημαντικές δηλώσεις στη μεταγραφή
   - Πληροφορίες επικοινωνίας (αν παρέχονται)

2. **Στυλ Γραφής:**
   - Χρήση τρίτου προσώπου
   - Ύφος: ${toneDescription}
   - Σαφής και περιεκτική γλώσσα
   - Αποφυγή τεχνικής ορολογίας εκτός αν είναι απαραίτητη
   - Τονισμός της σημασίας και του αντίκτυπου

3. **Μορφοποίηση:**
   - Χρήση Markdown
   - Επικεφαλίδες με # και ##
   - **Έντονα** για σημαντικές πληροφορίες
   - Bullet points για λίστες
   - Εισαγωγικά για δηλώσεις/αποσπάσματα

4. **Σημαντικό:**
   - Διατήρησε τα ονόματα και τους τίτλους όπως εμφανίζονται
   - Μην επινοείς πληροφορίες που δεν υπάρχουν στη μεταγραφή
   - Επικεντρώσου στα πιο σημαντικά και ενδιαφέροντα σημεία
   - Το δελτίο τύπου πρέπει να είναι 200-400 λέξεις

## ΜΕΤΑΓΡΑΦΗ

${transcriptionText}

## ΕΞΟΔΟΣ

Δημιούργησε το δελτίο τύπου στα Ελληνικά, ακολουθώντας τις παραπάνω οδηγίες. Επέστρεψε μόνο το δελτίο τύπου σε μορφή Markdown, χωρίς επιπλέον σχόλια.`;

  return prompt;
}
