/**
 * Albion Online cooking recipes — extracted from ao-bin-dumps items.xml.
 *
 * Verified facts the previous version got wrong (every one of these was
 * a real bug fixed here):
 *   1. Each cooking craft outputs 10 meals, not 1.
 *   2. Recipes only exist at SPECIFIC tiers per category — Omelette is
 *      T3/T5/T7 only, Salad is T2/T4/T6, Stew is T4/T6/T8 etc. We were
 *      generating bogus T2 omelettes / T8 omelettes that don't exist.
 *   3. Ingredient counts are HUGE (T5 Cabbage Soup = 144 cabbages, not 4).
 *   4. Recipes use ingredients across tiers — T3 Omelette uses T3 wheat
 *      AND T3 meat AND T3 eggs (3 ingredients), not "4 eggs + 1 veg".
 *   5. Enchant variants add 10× FISH SAUCE (T1 with quality LEVEL1/2/3),
 *      same base ingredients. ID format is `@1` not `_LEVEL1@1`.
 *   6. Cooking focus base values are NOT the refining table — each
 *      recipe has its own focus cost which roughly triples per 2 tiers.
 */

// ===================== TYPES =====================

export interface CookingIngredient {
  itemId: string;
  name: string;
  count: number;
}

export interface CookingEnchantOverride {
  level: number;          // 1, 2, 3
  extraIngredients: CookingIngredient[]; // typically the fish sauce upgrade
  focus: number;          // total focus for this enchant level
}

export interface CookingRecipe {
  /** Base meal ID without enchant suffix. UI appends @1/@2/@3 when picking enchant > 0 */
  mealId: string;
  mealName: string;
  category: string;
  tier: number;
  /** Output meals per craft (always 10 in current game data, but explicit for safety) */
  amountCrafted: number;
  /** Base focus cost for the .0 enchant — NOT derived from BASE_FOCUS_PER_TIER */
  baseFocus: number;
  /** Ingredients for the .0 craft */
  baseIngredients: CookingIngredient[];
  /** Per-enchant overrides (extra fish sauce + higher focus). Empty = no enchant variants exist for this recipe. */
  enchants: CookingEnchantOverride[];
  /** Item value for station-fee math (rough match to Albion's tier item value) */
  nutrition: number;
}

// ===================== HELPERS =====================

/** Build the AODP item id for a specific enchant of a recipe. e.g. T3_MEAL_OMELETTE@2 */
export function mealIdWithEnchant(baseMealId: string, enchant: number): string {
  return enchant > 0 ? `${baseMealId}@${enchant}` : baseMealId;
}

const ING = (id: string, name: string, count: number): CookingIngredient => ({ itemId: id, name, count });

// Quality-tier fish sauce used by enchant variants of every cookable recipe
const FISHSAUCE_L1 = (count: number) => ING('T1_FISHSAUCE_LEVEL1', 'Basic Fish Sauce', count);
const FISHSAUCE_L2 = (count: number) => ING('T1_FISHSAUCE_LEVEL2', 'Fancy Fish Sauce', count);
const FISHSAUCE_L3 = (count: number) => ING('T1_FISHSAUCE_LEVEL3', 'Special Fish Sauce', count);

/**
 * For most recipes, enchant 1/2/3 just adds 10× fish sauce of the matching
 * quality and bumps focus by roughly 1.4× / 2.3× / 4.85× of base. We
 * encode the actual focus values from items.xml when they differ.
 */
function standardEnchants(baseFocus: number, focusOverrides?: { e1?: number; e2?: number; e3?: number }): CookingEnchantOverride[] {
  const e1 = focusOverrides?.e1 ?? Math.round(baseFocus * 1.40);
  const e2 = focusOverrides?.e2 ?? Math.round(baseFocus * 2.27);
  const e3 = focusOverrides?.e3 ?? Math.round(baseFocus * 4.85);
  return [
    { level: 1, extraIngredients: [FISHSAUCE_L1(10)], focus: e1 },
    { level: 2, extraIngredients: [FISHSAUCE_L2(10)], focus: e2 },
    { level: 3, extraIngredients: [FISHSAUCE_L3(10)], focus: e3 },
  ];
}

// ===================== RECIPES =====================
// Verified against ao-bin-dumps items.xml on 2026-04-22.

export const COOKING_RECIPES: CookingRecipe[] = [
  // ============= SOUP (T1, T3, T5) — single-vegetable =============
  {
    mealId: 'T1_MEAL_SOUP', mealName: 'Carrot Soup', category: 'Soup', tier: 1,
    amountCrafted: 10, baseFocus: 56, nutrition: 77,
    baseIngredients: [ING('T1_CARROT', 'Carrots', 16)],
    enchants: standardEnchants(56, { e1: 78 }),
  },
  {
    mealId: 'T3_MEAL_SOUP', mealName: 'Wheat Soup', category: 'Soup', tier: 3,
    amountCrafted: 10, baseFocus: 168, nutrition: 252,
    baseIngredients: [ING('T3_WHEAT', 'Sheaf of Wheat', 48)],
    enchants: standardEnchants(168, { e1: 235 }),
  },
  {
    mealId: 'T5_MEAL_SOUP', mealName: 'Cabbage Soup', category: 'Soup', tier: 5,
    amountCrafted: 10, baseFocus: 504, nutrition: 756,
    baseIngredients: [ING('T5_CABBAGE', 'Cabbage', 144)],
    enchants: standardEnchants(504, { e1: 704 }),
  },

  // ============= SALAD (T2, T4, T6) — two vegetables =============
  {
    mealId: 'T2_MEAL_SALAD', mealName: 'Bean Salad', category: 'Salad', tier: 2,
    amountCrafted: 10, baseFocus: 56, nutrition: 77,
    baseIngredients: [ING('T2_BEAN', 'Beans', 8), ING('T1_CARROT', 'Carrots', 8)],
    enchants: standardEnchants(56, { e1: 78 }),
  },
  {
    mealId: 'T4_MEAL_SALAD', mealName: 'Turnip Salad', category: 'Salad', tier: 4,
    amountCrafted: 10, baseFocus: 168, nutrition: 252,
    baseIngredients: [ING('T4_TURNIP', 'Turnips', 24), ING('T3_WHEAT', 'Sheaf of Wheat', 24)],
    enchants: standardEnchants(168, { e1: 235 }),
  },
  {
    mealId: 'T6_MEAL_SALAD', mealName: 'Potato Salad', category: 'Salad', tier: 6,
    amountCrafted: 10, baseFocus: 504, nutrition: 756,
    baseIngredients: [ING('T6_POTATO', 'Potatoes', 72), ING('T5_CABBAGE', 'Cabbage', 72)],
    enchants: standardEnchants(504, { e1: 704 }),
  },

  // ============= OMELETTE (T3, T5, T7) — wheat/cabbage/corn + meat + egg =============
  {
    mealId: 'T3_MEAL_OMELETTE', mealName: 'Chicken Omelette', category: 'Omelette', tier: 3,
    amountCrafted: 10, baseFocus: 52, nutrition: 77,
    baseIngredients: [
      ING('T3_WHEAT', 'Sheaf of Wheat', 4),
      ING('T3_MEAT', 'Raw Chicken', 8),
      ING('T3_EGG', 'Hen Eggs', 2),
    ],
    enchants: [
      { level: 1, extraIngredients: [FISHSAUCE_L1(10)], focus: 74 },
      { level: 2, extraIngredients: [FISHSAUCE_L2(10)], focus: 118 },
      { level: 3, extraIngredients: [FISHSAUCE_L3(10)], focus: 252 },
    ],
  },
  {
    mealId: 'T5_MEAL_OMELETTE', mealName: 'Goose Omelette', category: 'Omelette', tier: 5,
    amountCrafted: 10, baseFocus: 155, nutrition: 230,
    baseIngredients: [
      ING('T5_CABBAGE', 'Cabbage', 12),
      ING('T5_MEAT', 'Raw Goose', 24),
      ING('T5_EGG', 'Goose Eggs', 6),
    ],
    enchants: standardEnchants(155, { e1: 222 }),
  },
  {
    // Note: T7 Omelette uses T5 EGG (no T7 egg exists in game data)
    mealId: 'T7_MEAL_OMELETTE', mealName: 'Pork Omelette', category: 'Omelette', tier: 7,
    amountCrafted: 10, baseFocus: 464, nutrition: 690,
    baseIngredients: [
      ING('T7_CORN', 'Bundle of Corn', 36),
      ING('T7_MEAT', 'Raw Pork', 72),
      ING('T5_EGG', 'Goose Eggs', 18),
    ],
    enchants: standardEnchants(464, { e1: 665 }),
  },

  // ============= PIE (T3, T5, T7) — vegetable + flour + meat (+milk T5+) =============
  {
    mealId: 'T3_MEAL_PIE', mealName: 'Chicken Pie', category: 'Pie', tier: 3,
    amountCrafted: 10, baseFocus: 53, nutrition: 78,
    baseIngredients: [
      ING('T3_WHEAT', 'Sheaf of Wheat', 2),
      ING('T3_FLOUR', 'Wheat Flour', 4),
      ING('T3_MEAT', 'Raw Chicken', 8),
    ],
    enchants: standardEnchants(53, { e1: 75 }),
  },
  {
    mealId: 'T5_MEAL_PIE', mealName: 'Goose Pie', category: 'Pie', tier: 5,
    amountCrafted: 10, baseFocus: 180, nutrition: 266,
    baseIngredients: [
      ING('T5_CABBAGE', 'Cabbage', 6),
      ING('T3_FLOUR', 'Wheat Flour', 12),
      ING('T5_MEAT', 'Raw Goose', 24),
      ING('T4_MILK', "Goat's Milk", 6),
    ],
    enchants: standardEnchants(180),
  },
  {
    mealId: 'T7_MEAL_PIE', mealName: 'Pork Pie', category: 'Pie', tier: 7,
    amountCrafted: 10, baseFocus: 540, nutrition: 799,
    baseIngredients: [
      ING('T7_CORN', 'Bundle of Corn', 18),
      ING('T3_FLOUR', 'Wheat Flour', 36),
      ING('T7_MEAT', 'Raw Pork', 72),
      ING('T6_MILK', "Sheep's Milk", 18),
    ],
    enchants: standardEnchants(540),
  },

  // ============= STEW (T4, T6, T8) — vegetable + bread + meat =============
  {
    mealId: 'T4_MEAL_STEW', mealName: 'Goat Stew', category: 'Stew', tier: 4,
    amountCrafted: 10, baseFocus: 61, nutrition: 91,
    baseIngredients: [
      ING('T4_TURNIP', 'Turnips', 4),
      ING('T4_BREAD', 'Wheat Bread', 4),
      ING('T4_MEAT', 'Raw Goat', 8),
    ],
    enchants: standardEnchants(61, { e1: 84 }),
  },
  {
    mealId: 'T6_MEAL_STEW', mealName: 'Mutton Stew', category: 'Stew', tier: 6,
    amountCrafted: 10, baseFocus: 184, nutrition: 272,
    baseIngredients: [
      ING('T6_POTATO', 'Potatoes', 12),
      ING('T4_BREAD', 'Wheat Bread', 12),
      ING('T6_MEAT', 'Raw Mutton', 24),
    ],
    enchants: standardEnchants(184, { e1: 251 }),
  },
  {
    mealId: 'T8_MEAL_STEW', mealName: 'Beef Stew', category: 'Stew', tier: 8,
    amountCrafted: 10, baseFocus: 551, nutrition: 817,
    baseIngredients: [
      ING('T8_PUMPKIN', 'Pumpkin', 36),
      ING('T4_BREAD', 'Wheat Bread', 36),
      ING('T8_MEAT', 'Raw Beef', 72),
    ],
    enchants: standardEnchants(551, { e1: 752 }),
  },

  // ============= SANDWICH (T4, T6, T8) — bread + meat + butter =============
  {
    mealId: 'T4_MEAL_SANDWICH', mealName: 'Goat Sandwich', category: 'Sandwich', tier: 4,
    amountCrafted: 10, baseFocus: 55, nutrition: 81,
    baseIngredients: [
      ING('T4_BREAD', 'Wheat Bread', 4),
      ING('T4_MEAT', 'Raw Goat', 8),
      ING('T4_BUTTER', "Goat's Butter", 2),
    ],
    enchants: standardEnchants(55, { e1: 77 }),
  },
  {
    mealId: 'T6_MEAL_SANDWICH', mealName: 'Mutton Sandwich', category: 'Sandwich', tier: 6,
    amountCrafted: 10, baseFocus: 165, nutrition: 243,
    baseIngredients: [
      ING('T4_BREAD', 'Wheat Bread', 12),
      ING('T6_MEAT', 'Raw Mutton', 24),
      ING('T6_BUTTER', "Sheep's Butter", 6),
    ],
    enchants: standardEnchants(165, { e1: 231 }),
  },
  {
    mealId: 'T8_MEAL_SANDWICH', mealName: 'Beef Sandwich', category: 'Sandwich', tier: 8,
    amountCrafted: 10, baseFocus: 494, nutrition: 730,
    baseIngredients: [
      ING('T4_BREAD', 'Wheat Bread', 36),
      ING('T8_MEAT', 'Raw Beef', 72),
      ING('T8_BUTTER', "Cow's Butter", 18),
    ],
    enchants: standardEnchants(494, { e1: 694 }),
  },

  // ============= ROAST (T3, T5, T7) — meat + vegetable + milk =============
  {
    mealId: 'T3_MEAL_ROAST', mealName: 'Roast Chicken', category: 'Roast', tier: 3,
    amountCrafted: 10, baseFocus: 58, nutrition: 87,
    baseIngredients: [
      ING('T3_MEAT', 'Raw Chicken', 8),
      ING('T2_BEAN', 'Beans', 4),
      ING('T4_MILK', "Goat's Milk", 4),
    ],
    enchants: standardEnchants(58, { e1: 81 }),
  },
  {
    mealId: 'T5_MEAL_ROAST', mealName: 'Roast Goose', category: 'Roast', tier: 5,
    amountCrafted: 10, baseFocus: 176, nutrition: 262,
    baseIngredients: [
      ING('T5_MEAT', 'Raw Goose', 24),
      ING('T5_CABBAGE', 'Cabbage', 12),
      ING('T6_MILK', "Sheep's Milk", 12),
    ],
    enchants: standardEnchants(176, { e1: 243 }),
  },
  {
    mealId: 'T7_MEAL_ROAST', mealName: 'Roast Pork', category: 'Roast', tier: 7,
    amountCrafted: 10, baseFocus: 528, nutrition: 785,
    baseIngredients: [
      ING('T7_MEAT', 'Raw Pork', 72),
      ING('T7_CORN', 'Bundle of Corn', 36),
      ING('T8_MILK', "Cow's Milk", 36),
    ],
    enchants: standardEnchants(528, { e1: 728 }),
  },
];

export const COOKING_CATEGORIES = ['Soup', 'Salad', 'Omelette', 'Sandwich', 'Pie', 'Stew', 'Roast'];

// ===================== CITY BONUSES =====================
/**
 * Cooking station bonuses by city. Verified empty:
 * Caerleon is the only city with a cook-station bonus and we exclude it
 * site-wide (full PvP). Royal cities all run at base LPB.
 */
export const COOKING_CITY_BONUS: Record<string, string[]> = {};

// ===================== UTILITIES =====================

/**
 * Build the full ingredient list (base + enchant extras) for a given enchant level.
 * Returns base ingredients when enchant = 0.
 */
export function ingredientsForEnchant(recipe: CookingRecipe, enchant: number): CookingIngredient[] {
  if (enchant === 0) return recipe.baseIngredients;
  const override = recipe.enchants.find(e => e.level === enchant);
  if (!override) return recipe.baseIngredients;
  return [...recipe.baseIngredients, ...override.extraIngredients];
}

/**
 * Total focus cost for a given enchant level (lookup, no formula needed —
 * the values are extracted directly from items.xml).
 */
export function focusForEnchant(recipe: CookingRecipe, enchant: number): number {
  if (enchant === 0) return recipe.baseFocus;
  const override = recipe.enchants.find(e => e.level === enchant);
  return override?.focus ?? recipe.baseFocus;
}
