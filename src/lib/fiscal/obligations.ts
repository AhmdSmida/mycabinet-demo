export const OBLIGATION_TYPES = {
  TVA: { label: 'Déclaration TVA', color: 'blue', icon: '📊', required_docs: ['facture', 'tva'] },
  IS: { label: 'Impôt sur les sociétés', color: 'purple', icon: '🏛️', required_docs: ['bilan'] },
  CFE: { label: 'Cotisation Foncière', color: 'orange', icon: '🏠', required_docs: ['justificatif'] },
  CVAE: { label: 'Cotisation sur la Valeur Ajoutée', color: 'yellow', icon: '💼', required_docs: ['bilan'] },
  DSN: { label: 'Déclaration Sociale Nominative', color: 'green', icon: '👥', required_docs: ['justificatif'] },
  BNC: { label: 'Bénéfices Non Commerciaux', color: 'red', icon: '📋', required_docs: ['bilan', 'justificatif'] },
  BIC: { label: 'Bénéfices Industriels et Commerciaux', color: 'indigo', icon: '🏭', required_docs: ['bilan'] },
};

export function getDaysUntilDue(dueDate: string): number {
  return Math.ceil((new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export function getUrgencyLevel(daysUntil: number): 'overdue' | 'critical' | 'warning' | 'normal' {
  if (daysUntil < 0) return 'overdue';
  if (daysUntil <= 5) return 'critical';
  if (daysUntil <= 15) return 'warning';
  return 'normal';
}

export const URGENCY_STYLES = {
  overdue:  { bg: 'bg-red-50',    border: 'border-red-200',    badge: 'bg-red-100 text-red-800',    dot: 'bg-red-500' },
  critical: { bg: 'bg-orange-50', border: 'border-orange-200', badge: 'bg-orange-100 text-orange-800', dot: 'bg-orange-500' },
  warning:  { bg: 'bg-yellow-50', border: 'border-yellow-200', badge: 'bg-yellow-100 text-yellow-800', dot: 'bg-yellow-500' },
  normal:   { bg: 'bg-white',     border: 'border-gray-200',   badge: 'bg-blue-100 text-blue-800',   dot: 'bg-blue-500' },
};
