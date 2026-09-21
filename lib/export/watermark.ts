/**
 * Export watermark for Free-plan exports (txt/pdf/docx).
 *
 * NOTE: exports run in the browser today, so this is a best-effort client-side check —
 * a determined user could bypass it. True enforcement needs server-side export/signing
 * (see docs/billing.md §7). It is applied wherever the caller knows the user's plan
 * carries `features.watermark`.
 */

export function watermarkBanner(lang: 'el' | 'en' = 'el'): string {
  return lang === 'el'
    ? 'Δημιουργήθηκε με το Grecho · Αναβαθμίστε για εξαγωγή χωρίς watermark — grecho.ai/pricing'
    : 'Created with Grecho · Upgrade to export without a watermark — grecho.ai/pricing';
}

/**
 * Append a watermark footer to plain-text/markdown export content. Rendered as a
 * trailing block so it flows into txt/pdf/docx (which all render from the same string).
 */
export function applyExportWatermark(content: string, lang: 'el' | 'en' = 'el'): string {
  return `${content}\n\n---\n${watermarkBanner(lang)}`;
}
