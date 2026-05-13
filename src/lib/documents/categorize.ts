export function detectCategory(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.includes('kbis') || lower.includes('k-bis')) return 'kbis';
  if (lower.includes('facture') || lower.includes('invoice')) return 'facture';
  if (lower.includes('tva') || lower.includes('vat')) return 'tva';
  if (lower.includes('bilan') || lower.includes('balance')) return 'bilan';
  if (lower.includes('contrat') || lower.includes('contract')) return 'contrat';
  if (lower.includes('justificatif')) return 'justificatif';
  return 'autre';
}
