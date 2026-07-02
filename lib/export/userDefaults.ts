/**
 * Global user defaults for export forms.
 *
 * Persists values like municipality, organization, council officials, and contact
 * info across transcriptions so the user does not re-type them on every export.
 */

const STORAGE_KEY = 'helios-export-user-defaults';

export interface ExportUserDefaults {
  // Official minutes
  municipality?: string;
  location?: string;
  mayor?: string;
  president?: string;
  secretary?: string;
  lastSessionNumber?: string;

  // Press release
  organization?: string;
  pressReleaseLocation?: string;

  // Shared contact info
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
}

export function loadUserDefaults(): ExportUserDefaults {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveUserDefaults(partial: Partial<ExportUserDefaults>): void {
  if (typeof window === 'undefined') return;
  try {
    const current = loadUserDefaults();
    const merged: ExportUserDefaults = { ...current };
    // Only overwrite with non-empty strings
    for (const [key, value] of Object.entries(partial) as Array<[keyof ExportUserDefaults, string | undefined]>) {
      if (typeof value === 'string' && value.trim() !== '') {
        merged[key] = value;
      }
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  } catch {
    // Ignore quota/serialization errors
  }
}

/**
 * Suggest the next session number. If previous was "14/2024" and the current
 * date is in 2024, returns "15/2024". If the year differs, starts at "1/<year>".
 * Otherwise returns the previous value unchanged (so the user can edit it).
 */
export function suggestNextSessionNumber(previous: string | undefined, dateIso: string): string {
  if (!previous) return '';
  const match = previous.match(/^(\d+)\s*\/\s*(\d{4})$/);
  if (!match) return previous;
  const num = parseInt(match[1], 10);
  const year = match[2];

  const currentYear = dateIso ? new Date(dateIso).getFullYear().toString() : year;
  if (currentYear !== year) {
    return `1/${currentYear}`;
  }
  return `${num + 1}/${year}`;
}
