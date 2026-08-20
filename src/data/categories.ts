import type { Category } from '../types'

/** Display order on the shopping list, roughly following a store layout. */
export const CATEGORY_ORDER: readonly Category[] = [
  'produce',
  'dairy',
  'bakery',
  'meat',
  'pantry',
  'beverages',
  'snacks',
  'frozen',
  'household',
  'personal-care',
  'other',
]

export const CATEGORY_LABELS: Record<Category, string> = {
  produce: 'Produce',
  dairy: 'Dairy',
  bakery: 'Bakery',
  meat: 'Meat & Seafood',
  pantry: 'Pantry',
  beverages: 'Beverages',
  snacks: 'Snacks',
  frozen: 'Frozen',
  household: 'Household',
  'personal-care': 'Personal Care',
  other: 'Other',
}

/**
 * Keyword -> category source data.
 *
 * Deliberately small and readable. Both singular and common plural forms are
 * listed where the plural is not a simple `+s`, so lookups stay predictable.
 * Multi-word keywords are supported and are matched before shorter ones,
 * which is what keeps "ice cream" out of Dairy and "dish soap" out of
 * Personal Care.
 */
export const CATEGORY_KEYWORDS: Record<Category, readonly string[]> = {
  produce: [
    'apple', 'banana', 'orange', 'tomato', 'tomatoes', 'potato', 'potatoes',
    'onion', 'garlic', 'ginger', 'lettuce', 'spinach', 'carrot', 'cucumber',
    'broccoli', 'cabbage', 'mango', 'grapes', 'lemon', 'lime', 'strawberry',
    'strawberries', 'blueberries', 'avocado', 'mushroom', 'bell pepper',
    'chilli', 'chili', 'coriander', 'cauliflower', 'peas', 'corn',
  ],
  dairy: [
    'milk', 'cheese', 'butter', 'yogurt', 'yoghurt', 'cream', 'curd',
    'paneer', 'ghee', 'egg', 'eggs', 'buttermilk', 'sour cream',
    'cream cheese', 'cottage cheese',
  ],
  bakery: [
    'bread', 'bun', 'bagel', 'croissant', 'cake', 'muffin', 'tortilla',
    'pita', 'baguette', 'roll', 'naan', 'pastry',
  ],
  meat: [
    'chicken', 'beef', 'pork', 'mutton', 'lamb', 'fish', 'salmon', 'tuna',
    'prawns', 'prawn', 'shrimp', 'bacon', 'sausage', 'turkey', 'ham', 'mince',
  ],
  pantry: [
    'rice', 'pasta', 'noodles', 'flour', 'sugar', 'salt', 'oil', 'olive oil',
    'vinegar', 'cereal', 'oats', 'beans', 'lentils', 'dal', 'honey', 'sauce',
    'ketchup', 'mayonnaise', 'mustard', 'jam', 'peanut butter', 'spices',
    'spice', 'tea', 'coffee', 'soup', 'canned tomatoes', 'baking powder',
  ],
  beverages: [
    'water', 'sparkling water', 'juice', 'orange juice', 'soda', 'cola',
    'coke', 'pepsi', 'lemonade', 'beer', 'wine', 'smoothie', 'energy drink',
    'iced tea', 'coconut water',
  ],
  snacks: [
    'chips', 'crisps', 'biscuit', 'biscuits', 'cookie', 'cookies',
    'chocolate', 'candy', 'popcorn', 'nuts', 'almonds', 'cashews',
    'crackers', 'granola bar', 'pretzels', 'wafers',
  ],
  frozen: [
    'ice cream', 'ice', 'frozen pizza', 'frozen peas', 'frozen fries',
    'frozen vegetables', 'frozen berries', 'fish fingers', 'ice cubes',
  ],
  household: [
    'detergent', 'dish soap', 'dishwasher tablets', 'paper towels',
    'toilet paper', 'trash bags', 'garbage bags', 'bin bags', 'cleaner',
    'bleach', 'sponge', 'aluminium foil', 'foil', 'cling film',
    'laundry detergent', 'fabric softener', 'batteries', 'light bulb',
  ],
  'personal-care': [
    'toothpaste', 'toothbrush', 'shampoo', 'conditioner', 'soap',
    'body wash', 'deodorant', 'razor', 'shaving cream', 'lotion',
    'moisturiser', 'moisturizer', 'sunscreen', 'floss', 'hand sanitizer',
    'tissues', 'face wash',
  ],
  other: [],
}

/**
 * Flattened keyword lookup, derived once at module load.
 * Sorted longest-first so the most specific keyword wins.
 */
export const KEYWORD_ENTRIES: readonly (readonly [string, Category])[] =
  Object.entries(CATEGORY_KEYWORDS)
    .flatMap(([category, keywords]) =>
      keywords.map((keyword) => [keyword, category as Category] as const),
    )
    .sort((a, b) => b[0].length - a[0].length)
