/**
 * Financial precision helpers.
 * All intermediate math is done in integer cents to avoid floating-point errors.
 */

/** Convert a BRL value to integer cents. */
export function toCents(value: number): number {
  return Math.round(value * 100);
}

/** Convert integer cents back to BRL value. */
export function fromCents(cents: number): number {
  return cents / 100;
}

/** Round a BRL value to exactly 2 decimal places via cents. */
export function roundTwo(value: number): number {
  return fromCents(Math.round(value * 100));
}

/** Format a number as BRL currency string (e.g. R$ 1.234,56). */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}
