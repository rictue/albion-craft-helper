// Albion Online cooking recipes
// Verified against live market API item IDs

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
  ingredients: CookingIngredient[];
}

// Vegetables per tier (game data: each tier = different vegetable)
const VEGETABLE: Record<number, { id: string; name: string }> = {
  2: { id: 'T2_CARROT',  name: 'Carrot' },
  3: { id: 'T3_BEAN',    name: 'Bean' },
  4: { id: 'T4_WHEAT',   name: 'Wheat' },
  5: { id: 'T5_TURNIP',  name: 'Turnip' },
  6: { id: 'T6_CABBAGE', name: 'Cabbage' },
  7: { id: 'T7_POTATO',  name: 'Potato' },
  8: { id: 'T8_CORN',    name: 'Corn' },
};

// Meat per tier
const MEAT: Record<number, { id: string; name: string }> = {
  3: { id: 'T3_MEAT', name: 'Chicken Meat' },
  4: { id: 'T4_MEAT', name: 'Goose Meat' },
  5: { id: 'T5_MEAT', name: 'Goat Meat' },
  6: { id: 'T6_MEAT', name: 'Pork' },
  7: { id: 'T7_MEAT', name: 'Mutton' },
  8: { id: 'T8_MEAT', name: 'Beef' },
};

// Eggs per tier
const EGG: Record<number, { id: string; name: string }> = {
  3: { id: 'T3_EGG', name: 'Chicken Egg' },
  4: { id: 'T4_EGG', name: 'Goose Egg' },
  5: { id: 'T5_EGG', name: 'Pigeon Egg' },
  6: { id: 'T6_EGG', name: 'Duck Egg' },
  7: { id: 'T7_EGG', name: 'Quail Egg' },
  8: { id: 'T8_EGG', name: 'Turkey Egg' },
};

// Butter per tier
const BUTTER = (t: number) => ({ id: `T${t}_BUTTER`, name: 'Butter' });
const FISHSAUCE = (t: number) => ({ id: `T${t}_FISHSAUCE`, name: 'Fish Sauce' });

// Recipe count scales with tier
const PRIMARY_COUNT: Record<number, number> = { 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6, 8: 8 };

function makeSoup(tier: number): CookingRecipe {
  const veg = VEGETABLE[tier];
  return {
    mealId: `T${tier}_MEAL_SOUP`,
    mealName: `${veg.name} Soup`,
    category: 'Soup',
    tier,
    ingredients: [
      { itemId: veg.id, name: veg.name, count: PRIMARY_COUNT[tier] },
      { itemId: FISHSAUCE(tier).id, name: FISHSAUCE(tier).name, count: 1 },
    ],
  };
}

function makeSalad(tier: number): CookingRecipe {
  const veg = VEGETABLE[tier];
  return {
    mealId: `T${tier}_MEAL_SALAD`,
    mealName: `${veg.name} Salad`,
    category: 'Salad',
    tier,
    ingredients: [
      { itemId: veg.id, name: veg.name, count: PRIMARY_COUNT[tier] },
      { itemId: BUTTER(tier).id, name: BUTTER(tier).name, count: 1 },
    ],
  };
}

function makeOmelette(tier: number): CookingRecipe {
  const egg = EGG[tier];
  const veg = VEGETABLE[tier];
  return {
    mealId: `T${tier}_MEAL_OMELETTE`,
    mealName: `${egg.name.split(' ')[0]} Omelette`,
    category: 'Omelette',
    tier,
    ingredients: [
      { itemId: egg.id, name: egg.name, count: PRIMARY_COUNT[tier] },
      { itemId: veg.id, name: veg.name, count: 1 },
    ],
  };
}

function makeSandwich(tier: number): CookingRecipe {
  const meat = MEAT[tier];
  const veg = VEGETABLE[tier];
  return {
    mealId: `T${tier}_MEAL_SANDWICH`,
    mealName: `${meat.name.split(' ')[0]} Sandwich`,
    category: 'Sandwich',
    tier,
    ingredients: [
      { itemId: meat.id, name: meat.name, count: PRIMARY_COUNT[tier] },
      { itemId: veg.id, name: veg.name, count: 2 },
    ],
  };
}

function makePie(tier: number): CookingRecipe {
  const meat = MEAT[tier];
  const veg = VEGETABLE[tier];
  return {
    mealId: `T${tier}_MEAL_PIE`,
    mealName: `${meat.name.split(' ')[0]} Pie`,
    category: 'Pie',
    tier,
    ingredients: [
      { itemId: meat.id, name: meat.name, count: PRIMARY_COUNT[tier] },
      { itemId: veg.id, name: veg.name, count: PRIMARY_COUNT[tier] },
      { itemId: BUTTER(tier).id, name: BUTTER(tier).name, count: 1 },
    ],
  };
}

function makeStew(tier: number): CookingRecipe {
  const meat = MEAT[tier];
  const veg = VEGETABLE[tier];
  return {
    mealId: `T${tier}_MEAL_STEW`,
    mealName: `${meat.name.split(' ')[0]} Stew`,
    category: 'Stew',
    tier,
    ingredients: [
      { itemId: meat.id, name: meat.name, count: PRIMARY_COUNT[tier] },
      { itemId: veg.id, name: veg.name, count: PRIMARY_COUNT[tier] },
      { itemId: FISHSAUCE(tier).id, name: FISHSAUCE(tier).name, count: 1 },
    ],
  };
}

function makeRoast(tier: number): CookingRecipe {
  const meat = MEAT[tier];
  return {
    mealId: `T${tier}_MEAL_ROAST`,
    mealName: `Roast ${meat.name.split(' ')[0]}`,
    category: 'Roast',
    tier,
    ingredients: [
      { itemId: meat.id, name: meat.name, count: PRIMARY_COUNT[tier] },
      { itemId: BUTTER(tier).id, name: BUTTER(tier).name, count: 1 },
    ],
  };
}

export const COOKING_RECIPES: CookingRecipe[] = [
  // Soup + Salad: T2-T8
  ...[2, 3, 4, 5, 6, 7, 8].map(makeSoup),
  ...[2, 3, 4, 5, 6, 7, 8].map(makeSalad),
  // Omelette: T3-T8 (needs eggs)
  ...[3, 4, 5, 6, 7, 8].map(makeOmelette),
  // Sandwich/Pie/Stew/Roast: T3-T8
  ...[3, 4, 5, 6, 7, 8].map(makeSandwich),
  ...[3, 4, 5, 6, 7, 8].map(makePie),
  ...[3, 4, 5, 6, 7, 8].map(makeStew),
  ...[3, 4, 5, 6, 7, 8].map(makeRoast),
];

export const COOKING_CATEGORIES = ['Soup', 'Salad', 'Omelette', 'Sandwich', 'Pie', 'Stew', 'Roast'];

// Cooking city bonuses - matching in-game station bonuses
export const COOKING_CITY_BONUS: Record<string, string[]> = {
  'Martlock': ['Stew', 'Roast'],
  'Lymhurst': ['Salad', 'Omelette'],
  'Bridgewatch': ['Sandwich', 'Pie'],
  'Fort Sterling': ['Soup'],
  'Thetford': ['Soup', 'Salad'],
};
