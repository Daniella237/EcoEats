export interface MenuItem {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly priceCents: number;
  /** Liste d’allergènes (ex. gluten, lait). */
  readonly allergens: readonly string[];
  /** Stock journalier planifié (référence). */
  readonly dailyStock: number;
  /** Stock restant commandable aujourd’hui. */
  readonly remainingStock: number;
}
