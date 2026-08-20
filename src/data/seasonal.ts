/**
 * Month-by-month produce, indexed 0 (January) to 11 (December).
 *
 * **Demo assumption:** this table follows **Northern Hemisphere** seasonality.
 * The assignment does not specify a region, and there is no seasonal API — this
 * is a small static dataset written for the assessment.
 *
 * Names use the canonical convention of the shopping list (lowercase,
 * singular) so a seasonal suggestion adds and categorises like any other item.
 */
export const SEASONAL_PRODUCE: readonly (readonly string[])[] = [
  ['orange', 'lemon', 'cabbage', 'carrot'], // January
  ['orange', 'lemon', 'spinach', 'cauliflower'], // February
  ['spinach', 'lettuce', 'carrot', 'cabbage'], // March
  ['lettuce', 'peas', 'spinach', 'strawberry'], // April
  ['strawberry', 'peas', 'cucumber', 'lettuce'], // May
  ['strawberry', 'cucumber', 'tomato', 'avocado'], // June
  ['tomato', 'corn', 'cucumber', 'mango'], // July
  ['tomato', 'corn', 'mango', 'grapes'], // August
  ['apple', 'grapes', 'corn', 'mushroom'], // September
  ['apple', 'potato', 'mushroom', 'broccoli'], // October
  ['apple', 'potato', 'cabbage', 'broccoli'], // November
  ['orange', 'potato', 'cabbage', 'carrot'], // December
]

/** Produce in season for a month index (0–11). Empty for an invalid index. */
export function produceInSeason(monthIndex: number): readonly string[] {
  return SEASONAL_PRODUCE[monthIndex] ?? []
}
