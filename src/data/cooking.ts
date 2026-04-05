// Albion Online cooking recipes
// Recipes source: in-game cooking station data (approximate, matches albiononlinetools.com)

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
  nutrition: number; // for cooking station fee calculation
}

// Helper to build recipes tier-scaled
function meal(
  category: string,
  mealBaseId: string,
  mealName: string,
  tier: number,
  ingredients: { baseId: string; name: string; count: number; tierOffset?: number }[],
  nutrition: number,
): CookingRecipe {
  return {
    mealId: `T${tier}_${mealBaseId}`,
    mealName: `${mealName} T${tier}`,
    category,
    tier,
    ingredients: ingredients.map(i => ({
      itemId: `T${tier + (i.tierOffset ?? 0)}_${i.baseId}`,
      name: i.name,
      count: i.count,
    })),
    nutrition,
  };
}

// Vegetable soup recipes: N vegetables + 1 fish sauce
const SOUP_RECIPES: CookingRecipe[] = [
  meal('Soup', 'MEAL_SOUP', 'Carrot Soup',   4, [{ baseId: 'CARROT',    name: 'Carrot',    count: 4 }, { baseId: 'FISHSAUCE_LEVEL1', name: 'Fish Sauce',  count: 1, tierOffset: -1 }], 192),
  meal('Soup', 'MEAL_SOUP', 'Bean Soup',     5, [{ baseId: 'BEAN',      name: 'Bean',      count: 5 }, { baseId: 'FISHSAUCE_LEVEL2', name: 'Fish Sauce',  count: 1, tierOffset: -1 }], 384),
  meal('Soup', 'MEAL_SOUP', 'Wheat Soup',    6, [{ baseId: 'WHEAT',     name: 'Wheat',     count: 6 }, { baseId: 'FISHSAUCE_LEVEL3', name: 'Fish Sauce',  count: 1, tierOffset: -1 }], 768),
  meal('Soup', 'MEAL_SOUP', 'Turnip Soup',   7, [{ baseId: 'TURNIP',    name: 'Turnip',    count: 7 }, { baseId: 'FISHSAUCE_LEVEL4', name: 'Fish Sauce',  count: 1, tierOffset: -1 }], 1536),
  meal('Soup', 'MEAL_SOUP', 'Cabbage Soup',  8, [{ baseId: 'CABBAGE',   name: 'Cabbage',   count: 8 }, { baseId: 'FISHSAUCE_LEVEL5', name: 'Fish Sauce',  count: 1, tierOffset: -1 }], 3072),
];

// Salad: vegetables + butter
const SALAD_RECIPES: CookingRecipe[] = [
  meal('Salad', 'MEAL_SALAD', 'Bean Salad',    4, [{ baseId: 'BEAN',    name: 'Bean',    count: 4 }, { baseId: 'BUTTER_LEVEL1', name: 'Butter', count: 1, tierOffset: -1 }], 192),
  meal('Salad', 'MEAL_SALAD', 'Wheat Salad',   5, [{ baseId: 'WHEAT',   name: 'Wheat',   count: 5 }, { baseId: 'BUTTER_LEVEL2', name: 'Butter', count: 1, tierOffset: -1 }], 384),
  meal('Salad', 'MEAL_SALAD', 'Turnip Salad',  6, [{ baseId: 'TURNIP',  name: 'Turnip',  count: 6 }, { baseId: 'BUTTER_LEVEL3', name: 'Butter', count: 1, tierOffset: -1 }], 768),
  meal('Salad', 'MEAL_SALAD', 'Cabbage Salad', 7, [{ baseId: 'CABBAGE', name: 'Cabbage', count: 7 }, { baseId: 'BUTTER_LEVEL4', name: 'Butter', count: 1, tierOffset: -1 }], 1536),
  meal('Salad', 'MEAL_SALAD', 'Potato Salad',  8, [{ baseId: 'POTATO',  name: 'Potato',  count: 8 }, { baseId: 'BUTTER_LEVEL5', name: 'Butter', count: 1, tierOffset: -1 }], 3072),
];

// Omelette: eggs + vegetables
const OMELETTE_RECIPES: CookingRecipe[] = [
  meal('Omelette', 'MEAL_OMELETTE', 'Chicken Omelette', 4, [{ baseId: 'EGGS_LEVEL1', name: 'Chicken Egg', count: 4 }, { baseId: 'BEAN',    name: 'Bean',    count: 1 }], 192),
  meal('Omelette', 'MEAL_OMELETTE', 'Goose Omelette',   5, [{ baseId: 'EGGS_LEVEL2', name: 'Goose Egg',   count: 5 }, { baseId: 'WHEAT',   name: 'Wheat',   count: 1 }], 384),
  meal('Omelette', 'MEAL_OMELETTE', 'Pigeon Omelette',  6, [{ baseId: 'EGGS_LEVEL3', name: 'Pigeon Egg',  count: 6 }, { baseId: 'TURNIP',  name: 'Turnip',  count: 1 }], 768),
  meal('Omelette', 'MEAL_OMELETTE', 'Ostrich Omelette', 7, [{ baseId: 'EGGS_LEVEL4', name: 'Ostrich Egg', count: 7 }, { baseId: 'CABBAGE', name: 'Cabbage', count: 1 }], 1536),
  meal('Omelette', 'MEAL_OMELETTE', 'Dragon Omelette',  8, [{ baseId: 'EGGS_LEVEL5', name: 'Dragon Egg',  count: 8 }, { baseId: 'POTATO',  name: 'Potato',  count: 1 }], 3072),
];

// Sandwich: meat + bread (wheat)
const SANDWICH_RECIPES: CookingRecipe[] = [
  meal('Sandwich', 'MEAL_SANDWICH', 'Goat Sandwich',   4, [{ baseId: 'MEAT_LEVEL1', name: 'Goat Meat', count: 4 }, { baseId: 'WHEAT',   name: 'Wheat',   count: 2 }], 192),
  meal('Sandwich', 'MEAL_SANDWICH', 'Mutton Sandwich', 5, [{ baseId: 'MEAT_LEVEL2', name: 'Mutton',    count: 5 }, { baseId: 'TURNIP',  name: 'Turnip',  count: 2 }], 384),
  meal('Sandwich', 'MEAL_SANDWICH', 'Pork Sandwich',   6, [{ baseId: 'MEAT_LEVEL3', name: 'Pork',      count: 6 }, { baseId: 'CABBAGE', name: 'Cabbage', count: 2 }], 768),
  meal('Sandwich', 'MEAL_SANDWICH', 'Beef Sandwich',   7, [{ baseId: 'MEAT_LEVEL4', name: 'Beef',      count: 7 }, { baseId: 'POTATO',  name: 'Potato',  count: 2 }], 1536),
  meal('Sandwich', 'MEAL_SANDWICH', 'Horse Sandwich',  8, [{ baseId: 'MEAT_LEVEL5', name: 'Horse Meat', count: 8 }, { baseId: 'CORN',    name: 'Corn',    count: 2 }], 3072),
];

// Pie: meat + wheat (flour)
const PIE_RECIPES: CookingRecipe[] = [
  meal('Pie', 'MEAL_PIE', 'Goat Pie',   4, [{ baseId: 'MEAT_LEVEL1', name: 'Goat Meat',  count: 4 }, { baseId: 'WHEAT',  name: 'Wheat',  count: 4 }, { baseId: 'BUTTER_LEVEL1', name: 'Butter', count: 1, tierOffset: -1 }], 192),
  meal('Pie', 'MEAL_PIE', 'Mutton Pie', 5, [{ baseId: 'MEAT_LEVEL2', name: 'Mutton',     count: 5 }, { baseId: 'TURNIP', name: 'Turnip', count: 5 }, { baseId: 'BUTTER_LEVEL2', name: 'Butter', count: 1, tierOffset: -1 }], 384),
  meal('Pie', 'MEAL_PIE', 'Pork Pie',   6, [{ baseId: 'MEAT_LEVEL3', name: 'Pork',       count: 6 }, { baseId: 'CABBAGE',name: 'Cabbage',count: 6 }, { baseId: 'BUTTER_LEVEL3', name: 'Butter', count: 1, tierOffset: -1 }], 768),
  meal('Pie', 'MEAL_PIE', 'Beef Pie',   7, [{ baseId: 'MEAT_LEVEL4', name: 'Beef',       count: 7 }, { baseId: 'POTATO', name: 'Potato', count: 7 }, { baseId: 'BUTTER_LEVEL4', name: 'Butter', count: 1, tierOffset: -1 }], 1536),
  meal('Pie', 'MEAL_PIE', 'Horse Pie',  8, [{ baseId: 'MEAT_LEVEL5', name: 'Horse Meat', count: 8 }, { baseId: 'CORN',   name: 'Corn',   count: 8 }, { baseId: 'BUTTER_LEVEL5', name: 'Butter', count: 1, tierOffset: -1 }], 3072),
];

// Stew: meat + vegetables + fish sauce
const STEW_RECIPES: CookingRecipe[] = [
  meal('Stew', 'MEAL_STEW', 'Goat Stew',   4, [{ baseId: 'MEAT_LEVEL1', name: 'Goat Meat',  count: 4 }, { baseId: 'BEAN',   name: 'Bean',   count: 4 }, { baseId: 'FISHSAUCE_LEVEL1', name: 'Fish Sauce', count: 1, tierOffset: -1 }], 192),
  meal('Stew', 'MEAL_STEW', 'Mutton Stew', 5, [{ baseId: 'MEAT_LEVEL2', name: 'Mutton',     count: 5 }, { baseId: 'WHEAT',  name: 'Wheat',  count: 5 }, { baseId: 'FISHSAUCE_LEVEL2', name: 'Fish Sauce', count: 1, tierOffset: -1 }], 384),
  meal('Stew', 'MEAL_STEW', 'Pork Stew',   6, [{ baseId: 'MEAT_LEVEL3', name: 'Pork',       count: 6 }, { baseId: 'TURNIP', name: 'Turnip', count: 6 }, { baseId: 'FISHSAUCE_LEVEL3', name: 'Fish Sauce', count: 1, tierOffset: -1 }], 768),
  meal('Stew', 'MEAL_STEW', 'Beef Stew',   7, [{ baseId: 'MEAT_LEVEL4', name: 'Beef',       count: 7 }, { baseId: 'CABBAGE',name: 'Cabbage',count: 7 }, { baseId: 'FISHSAUCE_LEVEL4', name: 'Fish Sauce', count: 1, tierOffset: -1 }], 1536),
  meal('Stew', 'MEAL_STEW', 'Horse Stew',  8, [{ baseId: 'MEAT_LEVEL5', name: 'Horse Meat', count: 8 }, { baseId: 'POTATO', name: 'Potato', count: 8 }, { baseId: 'FISHSAUCE_LEVEL5', name: 'Fish Sauce', count: 1, tierOffset: -1 }], 3072),
];

// Roast: meat + butter
const ROAST_RECIPES: CookingRecipe[] = [
  meal('Roast', 'MEAL_ROAST', 'Roast Goat',   4, [{ baseId: 'MEAT_LEVEL1', name: 'Goat Meat',  count: 4 }, { baseId: 'BUTTER_LEVEL1', name: 'Butter', count: 1, tierOffset: -1 }], 192),
  meal('Roast', 'MEAL_ROAST', 'Roast Mutton', 5, [{ baseId: 'MEAT_LEVEL2', name: 'Mutton',     count: 5 }, { baseId: 'BUTTER_LEVEL2', name: 'Butter', count: 1, tierOffset: -1 }], 384),
  meal('Roast', 'MEAL_ROAST', 'Roast Pork',   6, [{ baseId: 'MEAT_LEVEL3', name: 'Pork',       count: 6 }, { baseId: 'BUTTER_LEVEL3', name: 'Butter', count: 1, tierOffset: -1 }], 768),
  meal('Roast', 'MEAL_ROAST', 'Roast Beef',   7, [{ baseId: 'MEAT_LEVEL4', name: 'Beef',       count: 7 }, { baseId: 'BUTTER_LEVEL4', name: 'Butter', count: 1, tierOffset: -1 }], 1536),
  meal('Roast', 'MEAL_ROAST', 'Roast Horse',  8, [{ baseId: 'MEAT_LEVEL5', name: 'Horse Meat', count: 8 }, { baseId: 'BUTTER_LEVEL5', name: 'Butter', count: 1, tierOffset: -1 }], 3072),
];

export const COOKING_RECIPES: CookingRecipe[] = [
  ...SOUP_RECIPES,
  ...SALAD_RECIPES,
  ...OMELETTE_RECIPES,
  ...SANDWICH_RECIPES,
  ...PIE_RECIPES,
  ...STEW_RECIPES,
  ...ROAST_RECIPES,
];

export const COOKING_CATEGORIES = ['Soup', 'Salad', 'Omelette', 'Sandwich', 'Pie', 'Stew', 'Roast'];

// Cooking city bonuses - each city boosts certain food types
export const COOKING_CITY_BONUS: Record<string, string[]> = {
  'Martlock': ['Stew', 'Roast'],
  'Lymhurst': ['Salad', 'Omelette'],
  'Bridgewatch': ['Sandwich', 'Pie'],
  'Fort Sterling': ['Soup'],
  'Thetford': ['Soup'],
};
