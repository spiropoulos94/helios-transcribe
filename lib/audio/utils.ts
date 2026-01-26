/**
 * Sanitizes filename to be filesystem-safe while preserving extension
 * Removes special characters and limits length
 * @param fileName - Original filename
 * @param mimeType - Optional mimeType to infer extension if missing
 * @returns Sanitized filename with extension
 */
export function sanitizeFileName(fileName: string, mimeType?: string): string {
  // Extract extension
  const lastDotIndex = fileName.lastIndexOf('.');
  let basename = fileName;
  let extension = '';

  if (lastDotIndex !== -1 && lastDotIndex < fileName.length - 1) {
    basename = fileName.substring(0, lastDotIndex);
    extension = fileName.substring(lastDotIndex); // includes the dot
  } else if (mimeType) {
    // Infer extension from mimeType if no extension exists
    const mimeToExt: Record<string, string> = {
      'audio/mpeg': '.mp3',
      'audio/wav': '.wav',
      'audio/ogg': '.ogg',
      'audio/webm': '.webm',
      'audio/mp4': '.m4a',
      'video/mp4': '.mp4',
      'video/webm': '.webm',
    };
    extension = mimeToExt[mimeType] || '.mp3'; // default to .mp3
  }

  // Sanitize basename only
  const sanitized = basename
    .replace(/[^\w\s.-]/g, '_') // Replace special chars with underscore
    .replace(/\s+/g, '_')       // Replace spaces with underscore
    .replace(/_{2,}/g, '_')     // Replace multiple underscores with single
    .substring(0, 100);         // Limit length

  const finalBasename = sanitized || 'audio'; // Fallback if empty
  return finalBasename + extension;
}
