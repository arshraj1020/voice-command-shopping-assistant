/**
 * Currency formatting.
 *
 * Prices are stored as plain numbers everywhere; formatting is a display
 * concern and lives only here. Uses the platform's own `Intl` — no dependency.
 */

const RUPEE_FORMAT = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  // Whole rupees read naturally; paise only appear when a value actually has them.
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

/** `299` -> "₹299", `1249` -> "₹1,249" (Indian digit grouping). */
export function formatCurrency(value: number): string {
  try {
    return RUPEE_FORMAT.format(value)
  } catch {
    // Intl should always be present, but a missing locale must not break the UI.
    return `₹${value}`
  }
}
