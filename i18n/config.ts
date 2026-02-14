export const i18n = {
  defaultLocale: 'el',
  locales: ['el', 'en'],
} as const;

export type Locale = (typeof i18n)['locales'][number];

/**
 * Generate a locale-aware path.
 * Greek (default) has no prefix, English has /en prefix.
 */
export function localePath(path: string, locale: Locale): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  if (locale === i18n.defaultLocale) {
    // Greek is default - no prefix
    return normalizedPath === '/' ? '/' : normalizedPath;
  }
  // English needs /en prefix
  return `/en${normalizedPath === '/' ? '' : normalizedPath}`;
}
