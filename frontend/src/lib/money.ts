/** Montant en centimes depuis la réponse API (nombre ou chaîne). */
export function cents(n: unknown): number {
  if (typeof n === 'number' && Number.isFinite(n)) {
    return Math.round(n);
  }
  if (typeof n === 'string' && n.trim() !== '') {
    const v = Number(n.replace(',', '.'));
    return Number.isFinite(v) ? Math.round(v) : 0;
  }
  return 0;
}

/** Interprète le champ « € » : trim, espaces fines, virgule décimale → centimes. */
export function parseEuroInputToCents(raw: string): number | null {
  const cleaned = raw
    .trim()
    .replace(/[\u202f\u00a0]/g, '')
    .replace(/\s/g, '')
    .replace(',', '.');
  if (cleaned === '') {
    return 0;
  }
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0) {
    return null;
  }
  return Math.round(n * 100);
}
