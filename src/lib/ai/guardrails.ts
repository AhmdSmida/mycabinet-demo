const OUT_OF_SCOPE_KEYWORDS = ['avocat', 'juridique', 'procès', 'médecin', 'santé', 'immobilier', 'crypto', 'bourse'];

export function isOutOfScope(message: string): boolean {
  const lower = message.toLowerCase();
  return OUT_OF_SCOPE_KEYWORDS.some(kw => lower.includes(kw));
}

export function requiresDisclaimer(response: string): boolean {
  // Check if response contains specific monetary amounts or percentages
  return /\d+\s*%|\d+[\s,]\d+\s*€/.test(response);
}
