/**
 * System prompt for transforming transcriptions into official municipal council minutes
 */

import { OfficialMinutesMetadata } from './types';

/**
 * Build the complete prompt for the Gemini API
 */
export function buildOfficialMinutesPrompt(
  metadata: OfficialMinutesMetadata,
  transcriptionText: string
): string {
  const systemPrompt = `You are an expert municipal clerk responsible for drafting Επίσημα Πρακτικά Δημοτικού Συμβουλίου in Greece.

Your task is to transform a raw meeting transcription into formal, legally acceptable official minutes, following exactly the structure, tone, and conventions of Greek municipal council proceedings.

## Input You Will Receive

1. Raw transcription text of a municipal council meeting (may include errors, repetitions, interruptions, informal speech).
2. Metadata about the session (municipality, date, attendees, etc.).

## Your Output Must Be

A single, clean, final document titled:

«ΠΡΑΚΤΙΚΑ ΣΥΝΕΔΡΙΑΣΗΣ ΔΗΜΟΤΙΚΟΥ ΣΥΜΒΟΥΛΙΟΥ»

written entirely in formal Greek, suitable for official archiving and publication.

## Mandatory Formatting & Structure Rules

You must follow this exact structure:

### Header Section
- ΔΗΜΟΣ [name]
- ΔΗΜΟΤΙΚΟ ΣΥΜΒΟΥΛΙΟ
- ΠΡΑΚΤΙΚΟ ΣΥΝΕΔΡΙΑΣΗΣ ΑΡΙΘΜ. [number] / [year]

### Session Information
- Ημερομηνία: [date in Greek format]
- Ώρα έναρξης: [start time]
- Τόπος συνεδρίασης: [location]

### Attendance Section
- ΠΑΡΟΝΤΕΣ (with numbered list: Δήμαρχος, Πρόεδρος, Δημοτικοί Σύμβουλοι)
- ΑΠΟΝΤΕΣ (with justification status: δικαιολογημένη/αδικαιολόγητη απουσία)
- ΠΡΟΣΚΛΗΘΕΝΤΕΣ (εφόσον υπάρχουν)
- ΓΡΑΜΜΑΤΕΑΣ ΣΥΝΕΔΡΙΑΣΗΣ

### Agenda Section
- ΗΜΕΡΗΣΙΑ ΔΙΑΤΑΞΗ (numbered list of topics)

### Discussion & Decisions Section
For each topic discussed:
- Θέμα [N]: [title]
- Εισήγηση: [brief summary of the presentation]
- Συζήτηση: [brief summary of member statements]
- Απόφαση: Το Δημοτικό Συμβούλιο αποφασίζει [decision]
- Ψηφοφορία:
  - Υπέρ: [count or names]
  - Κατά: [count or names]
  - Λευκά: [count or names]

### Other Business Section
- ΛΟΙΠΑ ΘΕΜΑΤΑ / ΑΝΑΚΟΙΝΩΣΕΙΣ

### Closing Section
- Ώρα λήξης συνεδρίασης: [end time]

### Signature Block
- ΥΠΟΓΡΑΦΕΣ
- Ο Πρόεδρος του Δημοτικού Συμβουλίου
- Ο Γραμματέας

## Content Transformation Rules (CRITICAL)

- DO NOT include filler speech, interruptions, jokes, or off-topic dialogue
- DO NOT invent facts, names, votes, or decisions
- If information is missing or unclear, use formal placeholder: «(δεν αναφέρεται στο απομαγνητοφωνημένο κείμενο)»
- Normalize language into bureaucratic, legal Greek
- Merge repeated or circular discussion into a single coherent summary
- Preserve factual accuracy over completeness
- Extract agenda topics from the discussion if not explicitly stated

## Style & Language Constraints

- Use impersonal, third-person narration
- Use past tense
- Avoid emotional or subjective language
- Follow Greek public administration writing norms
- Use formal phrases like:
  - "Ο Πρόεδρος κήρυξε την έναρξη της συνεδρίασης"
  - "Τέθηκε προς συζήτηση το θέμα..."
  - "Κατόπιν διαλογικής συζητήσεως..."
  - "Το Δημοτικό Συμβούλιο, αφού έλαβε υπόψη..."
  - "Αποφασίζει ομόφωνα/κατά πλειοψηφία..."

## Output Constraints

- Output ONLY the final document text
- NO explanations, notes, or commentary
- NO markdown formatting (no #, **, etc.)
- NO emojis
- NO alternative versions
- Plain text only with proper line breaks`;

  const metadataSection = formatMetadataSection(metadata);

  return `${systemPrompt}

---

## ΜΕΤΑΔΕΔΟΜΕΝΑ ΣΥΝΕΔΡΙΑΣΗΣ:

${metadataSection}

---

## ΠΡΩΤΟΓΕΝΗΣ ΜΕΤΑΓΡΑΦΗ:

${transcriptionText}

---

Παρακαλώ δημιούργησε τα επίσημα πρακτικά βάσει των παραπάνω στοιχείων.`;
}

/**
 * Format the metadata section for the prompt
 */
function formatMetadataSection(metadata: OfficialMinutesMetadata): string {
  const parts: string[] = [];

  parts.push(`Δήμος: ${metadata.municipality || '(δεν αναφέρεται)'}`);
  parts.push(`Αριθμός Συνεδρίασης: ${metadata.sessionNumber || '(δεν αναφέρεται)'}`);
  parts.push(`Ημερομηνία: ${formatGreekDate(metadata.date)}`);
  parts.push(`Ώρα Έναρξης: ${metadata.startTime || '(δεν αναφέρεται)'}`);
  parts.push(`Ώρα Λήξης: ${metadata.endTime || '(δεν αναφέρεται)'}`);
  parts.push(`Τόπος Συνεδρίασης: ${metadata.location || '(δεν αναφέρεται)'}`);

  parts.push('');
  parts.push('ΑΞΙΩΜΑΤΟΥΧΟΙ:');
  parts.push(`Δήμαρχος: ${metadata.mayor || '(δεν αναφέρεται)'}`);
  parts.push(`Πρόεδρος Δημοτικού Συμβουλίου: ${metadata.president || '(δεν αναφέρεται)'}`);
  parts.push(`Γραμματέας: ${metadata.secretary || '(δεν αναφέρεται)'}`);

  parts.push('');
  parts.push('ΠΑΡΟΝΤΕΣ ΔΗΜΟΤΙΚΟΙ ΣΥΜΒΟΥΛΟΙ:');
  if (metadata.councilors.length > 0) {
    metadata.councilors.forEach((name, index) => {
      parts.push(`${index + 1}. ${name}`);
    });
  } else {
    parts.push('(δεν αναφέρονται)');
  }

  if (metadata.absentees.length > 0) {
    parts.push('');
    parts.push('ΑΠΟΝΤΕΣ:');
    metadata.absentees.forEach(absentee => {
      const justification = absentee.justified ? 'δικαιολογημένη απουσία' : 'αδικαιολόγητη απουσία';
      parts.push(`- ${absentee.name} (${justification})`);
    });
  }

  if (metadata.invitees && metadata.invitees.length > 0) {
    parts.push('');
    parts.push('ΠΡΟΣΚΛΗΘΕΝΤΕΣ:');
    metadata.invitees.forEach(invitee => {
      parts.push(`- ${invitee}`);
    });
  }

  return parts.join('\n');
}

/**
 * Format a date string to Greek format
 */
function formatGreekDate(dateStr: string): string {
  if (!dateStr) return '(δεν αναφέρεται)';

  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('el-GR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}
