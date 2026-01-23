/**
 * Formatting utilities for time and duration display
 */

/**
 * Formats duration in seconds to human-readable format (HH:MM:SS or MM:SS)
 * @param seconds - Duration in seconds
 * @returns Formatted string (HH:MM:SS or MM:SS)
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Formats processing time in milliseconds to human-readable format
 * @param ms - Processing time in milliseconds
 * @returns Formatted string (e.g., "5s", "2m 30s") or null if ms is undefined
 */
export function formatProcessingTime(ms?: number): string | null {
  if (!ms) return null;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}
