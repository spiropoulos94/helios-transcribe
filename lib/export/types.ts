/**
 * Types for Official Minutes Export Feature
 */

import { TranscriptionSegment } from '@/lib/ai/types';
import { SegmentApproval, SpeakerLabel } from '@/lib/transcriptionStorage';

/**
 * Metadata required to generate official municipal council minutes
 */
export interface OfficialMinutesMetadata {
  // Basic session info
  municipality: string;
  sessionNumber: string;
  date: string; // ISO date string (YYYY-MM-DD)
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  location: string;

  // Key officials
  mayor: string;
  president: string; // Council President
  secretary: string;

  // Attendance
  councilors: string[]; // Present council members
  absentees: Absentee[];
  invitees?: string[]; // Optional invited guests
}

/**
 * An absent member with justification status
 */
export interface Absentee {
  name: string;
  justified: boolean;
}

/**
 * Segment with resolved speaker display name for AI processing
 */
export interface ResolvedSegment {
  speaker: string;
  speakerDisplayName: string;
  text: string;
  startTime: number;
  endTime: number;
}

/**
 * Request body for the official minutes API endpoint
 */
export interface OfficialMinutesRequest {
  segments: ResolvedSegment[];
  metadata: OfficialMinutesMetadata;
}

/**
 * Response from the official minutes API endpoint
 */
export interface OfficialMinutesResponse {
  success: boolean;
  markdown?: string;
  error?: string;
  processingTimeMs?: number;
}

/**
 * Form state for the OfficialMinutesDialog
 */
export interface OfficialMinutesFormState {
  // Step tracking
  currentStep: 1 | 2 | 3;

  // Basic info (Step 1)
  municipality: string;
  sessionNumber: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;

  // Attendees (Step 2)
  mayor: string;
  president: string;
  secretary: string;
  councilors: string[];
  absentees: Absentee[];
  invitees: string[];

  // Generation state (Step 3)
  isGenerating: boolean;
  generatedMarkdown: string | null;
  error: string | null;
}

const STORAGE_KEY_PREFIX = 'official-minutes-form-state-';
const OLD_STORAGE_KEY = 'official-minutes-form-state';

/**
 * Get storage key for a specific transcription
 */
function getStorageKey(transcriptionId: string): string {
  return `${STORAGE_KEY_PREFIX}${transcriptionId}`;
}

/**
 * Migrate old storage format to new format (one-time migration)
 */
function migrateOldStorageFormat(transcriptionId: string): void {
  try {
    const oldData = localStorage.getItem(OLD_STORAGE_KEY);
    if (!oldData) return;

    const parsed = JSON.parse(oldData);
    // Check if this old data belongs to the current transcription
    if (parsed.transcriptionId === transcriptionId) {
      // Migrate to new format
      const newData = {
        state: parsed.state,
        savedAt: parsed.savedAt,
      };
      localStorage.setItem(getStorageKey(transcriptionId), JSON.stringify(newData));
    }
    // Remove old key after migration attempt
    localStorage.removeItem(OLD_STORAGE_KEY);
  } catch (e) {
    // Silently fail migration
  }
}

/**
 * Save form state to localStorage
 */
export function saveFormStateToStorage(state: OfficialMinutesFormState, transcriptionId: string): void {
  try {
    const storageData = {
      state: {
        ...state,
        isGenerating: false, // Don't persist loading state
        error: null, // Don't persist errors
      },
      savedAt: Date.now(),
    };
    localStorage.setItem(getStorageKey(transcriptionId), JSON.stringify(storageData));
  } catch (e) {
    console.warn('Failed to save form state to localStorage:', e);
  }
}

/**
 * Load form state from localStorage
 */
export function loadFormStateFromStorage(transcriptionId: string): OfficialMinutesFormState | null {
  try {
    // First, try to migrate old format data
    migrateOldStorageFormat(transcriptionId);

    const stored = localStorage.getItem(getStorageKey(transcriptionId));
    if (!stored) return null;

    const data = JSON.parse(stored);

    // Only restore if less than 24 hours old
    if (Date.now() - data.savedAt < 24 * 60 * 60 * 1000) {
      return {
        ...data.state,
        isGenerating: false,
        error: null,
      };
    }
    // Data is expired, remove it
    localStorage.removeItem(getStorageKey(transcriptionId));
    return null;
  } catch (e) {
    console.warn('Failed to load form state from localStorage:', e);
    return null;
  }
}

/**
 * Clear form state from localStorage for a specific transcription
 */
export function clearFormStateFromStorage(transcriptionId?: string): void {
  try {
    if (transcriptionId) {
      localStorage.removeItem(getStorageKey(transcriptionId));
    } else {
      // Clear all official minutes form states (for backwards compatibility)
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(STORAGE_KEY_PREFIX)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
    }
  } catch (e) {
    console.warn('Failed to clear form state from localStorage:', e);
  }
}

/**
 * Initial form state factory
 */
export function createInitialFormState(speakerLabels: SpeakerLabel[] = []): OfficialMinutesFormState {
  // Auto-populate councilors from speaker labels
  const councilors = speakerLabels
    .filter(label => label.customName && label.customName.trim() !== '')
    .map(label => label.customName);

  return {
    currentStep: 1,
    municipality: '',
    sessionNumber: '',
    date: new Date().toISOString().split('T')[0], // Today's date
    startTime: '',
    endTime: '',
    location: '',
    mayor: '',
    president: '',
    secretary: '',
    councilors,
    absentees: [],
    invitees: [],
    isGenerating: false,
    generatedMarkdown: null,
    error: null,
  };
}

/**
 * Extract metadata from form state for API request
 */
export function extractMetadataFromFormState(formState: OfficialMinutesFormState): OfficialMinutesMetadata {
  return {
    municipality: formState.municipality,
    sessionNumber: formState.sessionNumber,
    date: formState.date,
    startTime: formState.startTime,
    endTime: formState.endTime,
    location: formState.location,
    mayor: formState.mayor,
    president: formState.president,
    secretary: formState.secretary,
    councilors: formState.councilors.filter(c => c.trim() !== ''),
    absentees: formState.absentees.filter(a => a.name.trim() !== ''),
    invitees: formState.invitees.filter(i => i.trim() !== ''),
  };
}

/**
 * Resolve segments with display names for API submission
 */
export function resolveSegmentsForExport(
  segments: TranscriptionSegment[],
  approvals: SegmentApproval[],
  getSpeakerDisplayName: (id: string) => string
): ResolvedSegment[] {
  return segments.map((segment, index) => {
    const approval = approvals.find(a => a.segmentIndex === index);
    return {
      speaker: segment.speaker,
      speakerDisplayName: getSpeakerDisplayName(segment.speaker),
      text: approval?.editedText || segment.text,
      startTime: segment.startTime,
      endTime: segment.endTime,
    };
  });
}
