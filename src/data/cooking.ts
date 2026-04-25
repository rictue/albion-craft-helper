/**
 * Albion Online cooking recipes — verified against AODP item IDs.
 *
 * Recipe ingredient counts use the canonical 4 / 4-1 / 4-4-1 pattern that
 * applies across ALL tiers (T2-T8). The previous version of this file
 * incorrectly scaled the primary count with tier (1 for T2 → 8 for T8),
 * which produced wildly wrong cost estimates — a T2 soup was charged
 * for 1 carrot when in-game it's 4. Cooking station base focus is
 * documented in BASE_COOKING_FOCUS at the bottom.
 */

// ===================== INGREDIENT MAPS =====================

/** Vegetable item per tier — every cooking recipe pulls from here */
const VEGETABLE: Record<number, { id: string; name: string }> = {
  2: { id: 'T2_CARROT',  name: 'Carrot' },
  3: { id: 'T3_BEAN',    name: 'Bean' },
  4: { id: 'T4_WHEAT',   name: 'Wheat' },
  5: { id: 'T5_TURNIP',  name: 'Turnip' },
  6: { id: 'T6_CABBAGE', name: 'Cabbage' },
  7: { id: 'T7_POTATO',  name: 'Potato' },
  8: { id: 'T8_CORN',    name: 'Corn' },
};

/** Meat per tier (used by sandwich/pie/stew/roast). Note: chicken meat starts at T3. */
const MEAT: Record<number, { id: string; name: string }> = {
  3: { id: 'T3_MEAT', name: 'Chicken Meat' },
  4: { id: 'T4_MEAT', name: 'Goose Meat' },
  5: { id: 'T5_MEAT', name: 'Goat Meat' },
  6: { id: 'T6_MEAT', name: 'Pork' },
  7: { id: 'T7_MEAT', name: 'Mutton' },
  8: { id: 'T8_MEAT', name: 'Beef' },
};

/** Egg per tier (used by omelette). Eggs start at T3. */
const EGG: Record<number, { id: string; name: string }> = {
  3: { id: 'T3_EGG', name: 'Chicken Egg' },
  4: { id: 'T4_EGG', name: 'Goose Egg' },
  5: { id: 'T5_EGG', name: 'Pigeon Egg' },
  6: { id: 'T6_EGG', name: 'Duck Egg' },
  7: { id: 'T7_EGG', name: 'Quail Egg' },
  8: { id: 'T8_EGG', name: 'Turkey Egg' },
};

const BUTTER     = (t: number) => ({ id: `T${t}_BUTTER`,    name: 'Butter' });
const FISHSAUCE  = (t: number) => ({ id: `T${t}_FISHSAUCE`, name: 'Fish Sauce' });

// ===================== TYPES =====================

export interface CookingIngredient {
  itemId: string;
  name: string;
  count: number;
}

export interface CookingRecipe {
  mealId: string;
  mealName: string;
  category: string;
  tier: number;
  enchant: number; // 0 = base, 1-3 = .1/.2/.3
  ingredients: CookingIngredient[];
}

// ===================== RECIPE BUILDERS =====================

const ENCHANT_NAMES = ['', 'Uncommon', 'Rare', 'Epic'];

/** Append enchant suffix to meal id when needed */
function mealIdFor(baseId: string, enchant: number): string {
  return enchant > 0 ? `${baseId}_LEVEL${enchant}@${enchant}` : baseId;
}

function makeSoup(tier: number, enchant: number): CookingRecipe {
  const veg = VEGETABLE[tier];
  return {
    mealId: mealIdFor(`T${tier}_MEAL_SOUP`, enchant),
    mealName: `${enchant > 0 ? ENCHANT_NAMES[enchant] + ' ' : ''}${veg.name} Soup`,
    category: 'Soup',
    tier, enchant,
    ingredients: [
      { itemId: veg.id, name: veg.name, count: 4 },
      { itemId: FISHSAUCE(tier).id, name: FISHSAUCE(tier).name, count: 1 },
    ],
  };
}

function makeSalad(tier: number, enchant: number): CookingRecipe {
  const veg = VEGETABLE[tier];
  return {
    mealId: mealIdFor(`T${tier}_MEAL_SALAD`, enchant),
    mealName: `${enchant > 0 ? ENCHANT_NAMES[enchant] + ' ' : ''}${veg.name} Salad`,
    category: 'Salad',
    tier, enchant,
    ingredients: [
      { itemId: veg.id, name: veg.name, count: 4 },
      { itemId: BUTTER(tier).id, name: BUTTER(tier).name, count: 1 },
    ],
  };
}

function makeOmelette(tier: number, enchant: number): CookingRecipe {
  const egg = EGG[tier];
  const veg = VEGETABLE[tier];
  return {
    mealId: mealIdFor(`T${tier}_MEAL_OMELETTE`, enchant),
    mealName: `${enchant > 0 ? ENCHANT_NAMES[enchant] + ' ' : ''}${egg.name.split(' ')[0]} Omelette`,
    category: 'Omelette',
    tier, enchant,
    ingredients: [
      { itemId: egg.id, name: egg.name, count: 4 },
      { itemId: veg.id, name: veg.name, count: 1 },
    ],
  };
}

function makeSandwich(tier: number, enchant: number): CookingRecipe {
  const meat = MEAT[tier];
  const veg = VEGETABLE[tier];
  return {
    mealId: mealIdFor(`T${tier}_MEAL_SANDWICH`, enchant),
    mealName: `${enchant > 0 ? ENCHANT_NAMES[enchant] + ' ' : ''}${meat.name.split(' ')[0]} Sandwich`,
    category: 'Sandwich',
    tier, enchant,
    ingredients: [
      { itemId: meat.id, name: meat.name, count: 4 },
      { itemId: veg.id, name: veg.name, count: 1 },
      { itemId: BUTTER(tier).id, name: BUTTER(tier).name, count: 1 },
    ],
  };
}

function makePie(tier: number, enchant: number): CookingRecipe {
  const meat = MEAT[tier];
  const veg = VEGETABLE[tier];
  return {
    mealId: mealIdFor(`T${tier}_MEAL_PIE`, enchant),
    mealName: `${enchant > 0 ? ENCHANT_NAMES[enchant] + ' ' : ''}${meat.name.split(' ')[0]} Pie`,
    category: 'Pie',
    tier, enchant,
    ingredients: [
      { itemId: meat.id, name: meat.name, count: 4 },
      { itemId: veg.id, name: veg.name, count: 4 },
      { itemId: BUTTER(tier).id, name: BUTTER(tier).name, count: 1 },
    ],
  };
}

function makeStew(tier: number, enchant: number): CookingRecipe {
  const meat = MEAT[tier];
  const veg = VEGETABLE[tier];
  return {
    mealId: mealIdFor(`T${tier}_MEAL_STEW`, enchant),
    mealName: `${enchant > 0 ? ENCHANT_NAMES[enchant] + ' ' : ''}${meat.name.split(' ')[0]} Stew`,
    category: 'Stew',
    tier, enchant,
    ingredients: [
      { itemId: meat.id, name: meat.name, count: 4 },
      { itemId: veg.id, name: veg.name, count: 4 },
      { itemId: FISHSAUCE(tier).id, name: FISHSAUCE(tier).name, count: 1 },
    ],
  };
}

function makeRoast(tier: number, enchant: number): CookingRecipe {
  const meat = MEAT[tier];
  return {
    mealId: mealIdFor(`T${tier}_MEAL_ROAST`, enchant),
    mealName: `${enchant > 0 ? ENCHANT_NAMES[enchant] + ' ' : ''}Roast ${meat.name.split(' ')[0]}`,
    category: 'Roast',
    tier, enchant,
    ingredients: [
      { itemId: meat.id, name: meat.name, count: 4 },
      { itemId: BUTTER(tier).id, name: BUTTER(tier).name, count: 1 },
    ],
  };
}

// ===================== RECIPE GENERATION =====================

/**
 * Build all recipes for the given category, including .0 + .1 + .2 + .3
 * enchant variants for T4+. T2/T3 don't have enchanted meal variants in
 * Albion — same as refining.
 */
function generateAll(): CookingRecipe[] {
  const out: CookingRecipe[] = [];
  const enchantsForTier = (tier: number) => tier >= 4 ? [0, 1, 2, 3] : [0];

  // Soup + Salad: T2-T8 (vegetables only)
  for (const tier of [2, 3, 4, 5, 6, 7, 8]) {
    for (const e of enchantsForTier(tier)) {
      out.push(makeSoup(tier, e));
      out.push(makeSalad(tier, e));
    }
  }

  // Omelette/Sandwich/Pie/Stew/Roast: T3-T8 (need eggs / meat)
  for (const tier of [3, 4, 5, 6, 7, 8]) {
    for (const e of enchantsForTier(tier)) {
      out.push(makeOmelette(tier, e));
      out.push(makeSandwich(tier, e));
      out.push(makePie(tier, e));
      out.push(makeStew(tier, e));
      out.push(makeRoast(tier, e));
    }
  }

  return out;
}

export const COOKING_RECIPES: CookingRecipe[] = generateAll();

export const COOKING_CATEGORIES = ['Soup', 'Salad', 'Omelette', 'Sandwich', 'Pie', 'Stew', 'Roast'];

// ===================== CITY BONUSES =====================

/**
 * Cooking station bonuses by city. Each city in Albion has a +X% LPB bonus
 * for one or two specialty meal categories (effectively +40 LPB on top of
 * the 18 base, mirroring the refining specialty system).
 *
 * Note: this mapping is the user-reported in-game arrangement; if SBI
 * shifts patches, regenerate from the wiki.
 */
export const COOKING_CITY_BONUS: Record<string, string[]> = {
  'Martlock':      ['Stew', 'Roast'],
  'Lymhurst':      ['Salad', 'Omelette'],
  'Bridgewatch':   ['Sandwich', 'Pie'],
  'Fort Sterling': ['Soup'],
  'Thetford':      ['Soup', 'Salad'],
};

// ===================== FOCUS COST =====================

/**
 * Base focus cost per cooking craft, .0 enchant. Multiply by enchant
 * mult (2/4/8) and apply spec discount via computeFocusCost(). Cooking
 * uses the same exponent formula as refining.
 *
 * These values are the same as crafting/refining tier bases — Albion
 * uses one focus formula across all production professions. Pulled from
 * focusCost.ts BASE_FOCUS_PER_TIER, exported here for clarity.
 */
export const BASE_COOKING_FOCUS: Record<number, number> = {
  2: 6, 3: 18, 4: 48, 5: 101, 6: 201, 7: 402, 8: 604,
};
