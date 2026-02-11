/**
 * Types for Press Release Export Feature
 */

import { ResolvedSegment } from './types';

/**
 * Metadata for generating a press release
 */
export interface PressReleaseMetadata {
  // Basic info
  organization: string;
  title: string;
  date: string; // ISO date string (YYYY-MM-DD)
  location: string;

  // Contact info (optional)
  contactName: string;
  contactEmail: string;
  contactPhone: string;

  // Additional context
  targetAudience: string;
  keyPoints: string; // Free text for key messages to emphasize
  tone: 'formal' | 'neutral' | 'friendly';
}

/**
 * Request body for the press release API endpoint
 */
export interface PressReleaseRequest {
  segments: ResolvedSegment[];
  metadata: PressReleaseMetadata;
}

/**
 * Response from the press release API endpoint
 */
export interface PressReleaseResponse {
  success: boolean;
  markdown?: string;
  error?: string;
  processingTimeMs?: number;
}

/**
 * Form state for the PressReleaseDialog
 */
export interface PressReleaseFormState {
  // Step tracking
  currentStep: 1 | 2;

  // Basic info (Step 1)
  organization: string;
  title: string;
  date: string;
  location: string;
  targetAudience: string;
  keyPoints: string;
  tone: 'formal' | 'neutral' | 'friendly';

  // Contact info (optional, Step 1)
  contactName: string;
  contactEmail: string;
  contactPhone: string;

  // Generation state (Step 2)
  isGenerating: boolean;
  generatedMarkdown: string | null;
  error: string | null;
}

const STORAGE_KEY_PREFIX = 'press-release-form-state-';
const OLD_STORAGE_KEY = 'press-release-form-state';

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
  } catch {
    // Silently fail migration
  }
}

/**
 * Save form state to localStorage
 */
export function savePressReleaseFormStateToStorage(state: PressReleaseFormState, transcriptionId: string): void {
  try {
    const storageData = {
      state: {
        ...state,
        isGenerating: false,
        error: null,
      },
      savedAt: Date.now(),
    };
    localStorage.setItem(getStorageKey(transcriptionId), JSON.stringify(storageData));
  } catch (e) {
    console.warn('Failed to save press release form state to localStorage:', e);
  }
}

/**
 * Load form state from localStorage
 */
export function loadPressReleaseFormStateFromStorage(transcriptionId: string): PressReleaseFormState | null {
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
    console.warn('Failed to load press release form state from localStorage:', e);
    return null;
  }
}

/**
 * Clear form state from localStorage for a specific transcription
 */
export function clearPressReleaseFormStateFromStorage(transcriptionId?: string): void {
  try {
    if (transcriptionId) {
      localStorage.removeItem(getStorageKey(transcriptionId));
    } else {
      // Clear all press release form states (for backwards compatibility)
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
    console.warn('Failed to clear press release form state from localStorage:', e);
  }
}

/**
 * Initial form state factory
 */
export function createInitialPressReleaseFormState(): PressReleaseFormState {
  return {
    currentStep: 1,
    organization: '',
    title: '',
    date: new Date().toISOString().split('T')[0],
    location: '',
    targetAudience: '',
    keyPoints: '',
    tone: 'formal',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    isGenerating: false,
    generatedMarkdown: null,
    error: null,
  };
}

/**
 * Extract metadata from form state for API request
 */
export function extractPressReleaseMetadataFromFormState(formState: PressReleaseFormState): PressReleaseMetadata {
  return {
    organization: formState.organization,
    title: formState.title,
    date: formState.date,
    location: formState.location,
    contactName: formState.contactName,
    contactEmail: formState.contactEmail,
    contactPhone: formState.contactPhone,
    targetAudience: formState.targetAudience,
    keyPoints: formState.keyPoints,
    tone: formState.tone,
  };
}
